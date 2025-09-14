// Integration Service for Multi-Org Integration Platform
// Simulates Salesforce and external system integrations

const axios = require('axios');
const aiService = require('./aiService');

class IntegrationService {
  constructor() {
    this.salesforceEndpoints = {
      login: '/services/oauth2/token',
      query: '/services/data/v58.0/query',
      sobject: '/services/data/v58.0/sobjects',
      composite: '/services/data/v58.0/composite'
    };
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  // Perform sync operation
  async performSync(integration) {
    const startTime = Date.now();
    console.log(`Starting sync for integration: ${integration.name}`);

    try {
      // Validate integration configuration
      this.validateIntegrationConfig(integration);

      // Get authentication tokens (simulate)
      const [sourceAuth, targetAuth] = await Promise.all([
        this.authenticate(integration.sourceOrg),
        this.authenticate(integration.targetOrg)
      ]);

      // Query source data
      const sourceData = await this.querySourceData(integration, sourceAuth);
      console.log(`Retrieved ${sourceData.length} records from source`);

      // Process data in batches for better performance
      const batchSize = 50;
      const batches = this.createBatches(sourceData, batchSize);
      const results = {
        totalRecords: sourceData.length,
        processedRecords: 0,
        successfulRecords: 0,
        failedRecords: 0,
        conflicts: 0,
        errors: [],
        processingTime: 0
      };

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} records)`);

        try {
          const batchResult = await this.processBatch(batch, integration, targetAuth);
          
          results.processedRecords += batch.length;
          results.successfulRecords += batchResult.successful;
          results.failedRecords += batchResult.failed;
          results.conflicts += batchResult.conflicts;
          results.errors.push(...batchResult.errors);

          // Small delay between batches to avoid rate limiting
          if (i < batches.length - 1) {
            await this.delay(200);
          }

        } catch (batchError) {
          console.error(`Batch ${i + 1} processing failed:`, batchError);
          results.failedRecords += batch.length;
          results.errors.push({
            batch: i + 1,
            error: batchError.message,
            recordCount: batch.length
          });
        }
      }

      results.processingTime = Date.now() - startTime;
      results.successRate = results.totalRecords > 0 
        ? ((results.successfulRecords / results.totalRecords) * 100).toFixed(2)
        : 0;

      console.log(`Sync completed for ${integration.name}:`, results);
      return results;

    } catch (error) {
      console.error(`Sync failed for ${integration.name}:`, error);
      throw {
        message: 'Sync operation failed',
        error: error.message,
        processingTime: Date.now() - startTime,
        integration: integration.name
      };
    }
  }

  // Validate integration configuration
  validateIntegrationConfig(integration) {
    const required = ['sourceOrg', 'targetOrg', 'fieldMappings'];
    
    for (const field of required) {
      if (!integration[field]) {
        throw new Error(`Integration configuration missing required field: ${field}`);
      }
    }

    if (!integration.sourceOrg.loginUrl || !integration.targetOrg.loginUrl) {
      throw new Error('Source and target org login URLs are required');
    }

    if (!integration.fieldMappings || integration.fieldMappings.length === 0) {
      throw new Error('At least one field mapping is required');
    }
  }

  // Authenticate with Salesforce org (simulated)
  async authenticate(org) {
    console.log(`Authenticating with ${org.name}...`);
    
    // Simulate authentication delay
    await this.delay(300);
    
    // In a real implementation, this would make an OAuth2 call to Salesforce
    // For demo purposes, we'll simulate a successful authentication
    const mockToken = {
      access_token: `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      instance_url: org.loginUrl.replace('login.salesforce.com', `${org.name.toLowerCase()}.my.salesforce.com`),
      token_type: 'Bearer',
      expires_in: 7200,
      issued_at: Date.now()
    };

    console.log(`Authentication successful for ${org.name}`);
    return mockToken;
  }

  // Query source data (simulated)
  async querySourceData(integration, auth) {
    console.log(`Querying ${integration.sourceOrg.objectType} from ${integration.sourceOrg.name}...`);
    
    // Simulate API call delay
    await this.delay(500);
    
    // Generate mock data based on object type
    const mockData = this.generateMockData(integration.sourceOrg.objectType, 25); // Simulate 25 records
    
    console.log(`Retrieved ${mockData.length} ${integration.sourceOrg.objectType} records`);
    return mockData;
  }

  // Process batch of records
  async processBatch(batch, integration, targetAuth) {
    const results = {
      successful: 0,
      failed: 0,
      conflicts: 0,
      errors: []
    };

    for (const record of batch) {
      try {
        // Apply field mappings
        const mappedRecord = await this.applyFieldMappings(record, integration.fieldMappings);
        
        // AI enhancement: entity and sentiment analysis
        const aiAnalysis = await Promise.all([
          aiService.analyzeEntities(JSON.stringify(record)),
          aiService.analyzeSentiment(JSON.stringify(record))
        ]);
        
        mappedRecord._aiEnhancement = {
          entities: aiAnalysis[0].entities,
          sentiment: aiAnalysis[1]
        };

        // Detect conflicts
        const conflicts = await this.detectConflicts(mappedRecord, integration);
        
        if (conflicts.length > 0) {
          // Resolve conflicts using AI
          const resolution = await aiService.resolveConflicts(
            conflicts, 
            integration.syncSettings.conflictResolution
          );
          
          if (resolution.resolvedConflicts > 0) {
            results.conflicts += conflicts.length;
            // Apply conflict resolution
            this.applyConflictResolution(mappedRecord, resolution);
          }
        }

        // Create/update record in target system
        await this.syncToTarget(mappedRecord, integration, targetAuth);
        results.successful++;

      } catch (error) {
        console.error(`Record processing failed:`, error);
        results.failed++;
        results.errors.push({
          recordId: record.Id,
          error: error.message
        });
      }
    }

    return results;
  }

  // Apply field mappings
  async applyFieldMappings(sourceRecord, fieldMappings) {
    const mappedRecord = {};
    
    for (const mapping of fieldMappings) {
      try {
        let sourceValue = sourceRecord[mapping.sourceField];
        
        // Apply transformation rule if specified
        if (mapping.transformationRule && sourceValue != null) {
          sourceValue = await this.applyTransformation(sourceValue, mapping.transformationRule);
        }
        
        mappedRecord[mapping.targetField] = sourceValue;
        
      } catch (transformError) {
        console.error(`Field mapping error for ${mapping.sourceField}:`, transformError);
        // Keep original value on transformation error
        mappedRecord[mapping.targetField] = sourceRecord[mapping.sourceField];
      }
    }
    
    return mappedRecord;
  }

  // Apply transformation rules
  async applyTransformation(value, rule) {
    if (!value) return value;
    
    try {
      switch (rule) {
        case 'formatPhone(value)':
          return this.formatPhone(value);
          
        case 'normalizeEmail(value)':
          return this.normalizeEmail(value);
          
        case 'formatDate(value)':
          return this.formatDate(value);
          
        case 'formatCurrency(value)':
          return this.formatCurrency(value);
          
        case 'normalizeName(value)':
          return this.normalizeName(value);
          
        case 'directMapping(value)':
        default:
          return value;
      }
    } catch (error) {
      console.error(`Transformation error for rule ${rule}:`, error);
      return value; // Return original value on error
    }
  }

  // Transformation helper functions
  formatPhone(phone) {
    if (!phone) return phone;
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1,4)}) ${cleaned.slice(4,7)}-${cleaned.slice(7)}`;
    }
    return phone; // Return original if can't format
  }

  normalizeEmail(email) {
    if (!email) return email;
    return email.toLowerCase().trim();
  }

  formatDate(dateValue) {
    if (!dateValue) return dateValue;
    try {
      const date = new Date(dateValue);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    } catch (error) {
      return dateValue;
    }
  }

  formatCurrency(amount) {
    if (!amount) return amount;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return amount;
    return Math.round(numAmount * 100) / 100; // Round to 2 decimal places
  }

  normalizeName(name) {
    if (!name) return name;
    return name.trim().replace(/\s+/g, ' '); // Remove extra spaces
  }

  // Detect conflicts (simulated)
  async detectConflicts(mappedRecord, integration) {
    const conflicts = [];
    
    // Simulate conflict detection delay
    await this.delay(50);
    
    // Random conflict generation for demonstration
    if (Math.random() < 0.15) { // 15% chance of conflict
      const conflictFields = Object.keys(mappedRecord).slice(0, 2);
      
      for (const field of conflictFields) {
        if (mappedRecord[field]) {
          conflicts.push({
            field: field,
            sourceValue: mappedRecord[field],
            targetValue: `existing_${mappedRecord[field]}`, // Simulated existing value
            type: 'DATA_CONFLICT',
            dataType: this.getFieldDataType(field)
          });
        }
      }
    }
    
    return conflicts;
  }

  // Apply conflict resolution
  applyConflictResolution(mappedRecord, resolution) {
    if (resolution.resolutions) {
      for (const fieldResolution of resolution.resolutions) {
        if (fieldResolution.resolved) {
          mappedRecord[fieldResolution.field] = fieldResolution.resolvedValue;
        }
      }
    }
  }

  // Sync to target system (simulated)
  async syncToTarget(mappedRecord, integration, targetAuth) {
    console.log(`Syncing record to ${integration.targetOrg.name}...`);
    
    // Simulate API call delay
    await this.delay(200);
    
    // Simulate random failures (5% failure rate)
    if (Math.random() < 0.05) {
      throw new Error(`Target system error: ${this.getRandomError()}`);
    }
    
    // Simulate successful sync
    const targetRecordId = `target_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`Record synced successfully. Target ID: ${targetRecordId}`);
    
    return { id: targetRecordId, success: true };
  }

  // Test connection to org
  async testConnection(integration) {
    const results = {
      sourceOrg: { status: 'testing...', error: null },
      targetOrg: { status: 'testing...', error: null },
      overall: 'testing...'
    };

    try {
      // Test source org connection
      try {
        const sourceAuth = await this.authenticate(integration.sourceOrg);
        results.sourceOrg.status = 'connected';
        results.sourceOrg.instanceUrl = sourceAuth.instance_url;
      } catch (sourceError) {
        results.sourceOrg.status = 'failed';
        results.sourceOrg.error = sourceError.message;
      }

      // Test target org connection
      try {
        const targetAuth = await this.authenticate(integration.targetOrg);
        results.targetOrg.status = 'connected';
        results.targetOrg.instanceUrl = targetAuth.instance_url;
      } catch (targetError) {
        results.targetOrg.status = 'failed';
        results.targetOrg.error = targetError.message;
      }

      // Determine overall status
      if (results.sourceOrg.status === 'connected' && results.targetOrg.status === 'connected') {
        results.overall = 'success';
      } else {
        results.overall = 'partial';
      }

    } catch (error) {
      results.overall = 'failed';
      results.error = error.message;
    }

    return results;
  }

  // Helper functions
  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getFieldDataType(fieldName) {
    const fieldName_lower = fieldName.toLowerCase();
    if (fieldName_lower.includes('email')) return 'String';
    if (fieldName_lower.includes('phone')) return 'String';
    if (fieldName_lower.includes('date')) return 'Date';
    if (fieldName_lower.includes('amount') || fieldName_lower.includes('revenue')) return 'Number';
    if (fieldName_lower.includes('active') || fieldName_lower.includes('flag')) return 'Boolean';
    return 'String'; // Default
  }

  getRandomError() {
    const errors = [
      'INVALID_FIELD_FOR_INSERT_UPDATE',
      'REQUIRED_FIELD_MISSING',
      'DUPLICATE_VALUE',
      'FIELD_CUSTOM_VALIDATION_EXCEPTION',
      'INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY',
      'UNABLE_TO_LOCK_ROW',
      'REQUEST_LIMIT_EXCEEDED'
    ];
    return errors[Math.floor(Math.random() * errors.length)];
  }

  // Generate mock data for testing
  generateMockData(objectType, count = 10) {
    const mockData = [];
    
    for (let i = 1; i <= count; i++) {
      let record;
      
      switch (objectType) {
        case 'Account':
          record = this.generateMockAccount(i);
          break;
        case 'Contact':
          record = this.generateMockContact(i);
          break;
        case 'Lead':
          record = this.generateMockLead(i);
          break;
        case 'Opportunity':
          record = this.generateMockOpportunity(i);
          break;
        case 'Case':
          record = this.generateMockCase(i);
          break;
        default:
          record = this.generateMockGeneric(i);
      }
      
      mockData.push(record);
    }
    
    return mockData;
  }

  generateMockAccount(index) {
    const companies = ['Tech Corp', 'Global Solutions', 'Innovation Labs', 'Enterprise Systems', 'Digital Works'];
    const industries = ['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail'];
    
    return {
      Id: `account_${Date.now()}_${index}`,
      Name: `${companies[index % companies.length]} ${index}`,
      Phone: `(555) ${String(123 + index).padStart(3, '0')}-${String(4567 + index).padStart(4, '0')}`,
      Website: `https://www.company${index}.com`,
      Industry: industries[index % industries.length],
      BillingStreet: `${100 + index} Business Blvd`,
      BillingCity: ['New York', 'San Francisco', 'Chicago', 'Boston', 'Austin'][index % 5],
      BillingState: ['NY', 'CA', 'IL', 'MA', 'TX'][index % 5],
      BillingPostalCode: String(10001 + index),
      BillingCountry: 'USA',
      AnnualRevenue: (1000000 + index * 250000),
      NumberOfEmployees: 50 + index * 25,
      CreatedDate: new Date(Date.now() - index * 86400000).toISOString(),
      LastModifiedDate: new Date().toISOString()
    };
  }

  generateMockContact(index) {
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    const titles = ['Manager', 'Director', 'VP', 'Analyst', 'Coordinator', 'Specialist'];
    
    const firstName = firstNames[index % firstNames.length];
    const lastName = lastNames[index % lastNames.length];
    
    return {
      Id: `contact_${Date.now()}_${index}`,
      FirstName: firstName,
      LastName: `${lastName}${index}`,
      Email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@company.com`,
      Phone: `(555) ${String(200 + index).padStart(3, '0')}-${String(1000 + index).padStart(4, '0')}`,
      MobilePhone: `(555) ${String(800 + index).padStart(3, '0')}-${String(5000 + index).padStart(4, '0')}`,
      Title: titles[index % titles.length],
      Department: ['Sales', 'Marketing', 'Engineering', 'HR', 'Finance'][index % 5],
      MailingStreet: `${200 + index} Main Street`,
      MailingCity: ['Seattle', 'Denver', 'Atlanta', 'Phoenix', 'Portland'][index % 5],
      MailingState: ['WA', 'CO', 'GA', 'AZ', 'OR'][index % 5],
      MailingPostalCode: String(20001 + index),
      MailingCountry: 'USA',
      CreatedDate: new Date(Date.now() - index * 86400000).toISOString(),
      LastModifiedDate: new Date().toISOString()
    };
  }

  generateMockLead(index) {
    const firstNames = ['Alex', 'Sam', 'Jordan', 'Casey', 'Morgan', 'Taylor', 'Riley', 'Avery'];
    const lastNames = ['Anderson', 'Thompson', 'Martinez', 'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee'];
    const companies = ['StartupCo', 'TechVentures', 'InnovateLabs', 'GrowthTech', 'ScaleUp'];
    const sources = ['Web', 'Phone Inquiry', 'Partner Referral', 'Trade Show', 'Advertisement'];
    
    const firstName = firstNames[index % firstNames.length];
    const lastName = lastNames[index % lastNames.length];
    
    return {
      Id: `lead_${Date.now()}_${index}`,
      FirstName: firstName,
      LastName: `${lastName}${index}`,
      Company: `${companies[index % companies.length]} ${index}`,
      Email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@startup.com`,
      Phone: `(555) ${String(300 + index).padStart(3, '0')}-${String(2000 + index).padStart(4, '0')}`,
      Title: 'Decision Maker',
      Industry: ['Technology', 'SaaS', 'E-commerce', 'Healthcare', 'Education'][index % 5],
      Status: ['New', 'Contacted', 'Qualified', 'Unqualified'][index % 4],
      Rating: ['Hot', 'Warm', 'Cold'][index % 3],
      LeadSource: sources[index % sources.length],
      Street: `${300 + index} Innovation Drive`,
      City: ['San Jose', 'Austin', 'Raleigh', 'Boulder', 'Nashville'][index % 5],
      State: ['CA', 'TX', 'NC', 'CO', 'TN'][index % 5],
      PostalCode: String(30001 + index),
      Country: 'USA',
      CreatedDate: new Date(Date.now() - index * 86400000).toISOString(),
      LastModifiedDate: new Date().toISOString()
    };
  }

  generateMockOpportunity(index) {
    const oppNames = ['Enterprise Deal', 'Strategic Partnership', 'Platform License', 'Service Contract', 'Technology Upgrade'];
    const stages = ['Prospecting', 'Qualification', 'Needs Analysis', 'Proposal', 'Negotiation', 'Closed Won'];
    const types = ['New Customer', 'Existing Customer - Upgrade', 'Existing Customer - Renewal', 'Existing Customer - Downgrade'];
    
    return {
      Id: `opportunity_${Date.now()}_${index}`,
      Name: `${oppNames[index % oppNames.length]} ${index}`,
      Amount: 50000 + (index * 25000),
      CloseDate: new Date(Date.now() + (30 + index * 15) * 86400000).toISOString().split('T')[0],
      StageName: stages[index % stages.length],
      Probability: Math.min(10 + (index * 15), 90),
      Type: types[index % types.length],
      LeadSource: ['Web', 'Phone Inquiry', 'Partner Referral', 'Trade Show'][index % 4],
      Description: `This is a sample opportunity ${index} for demonstration purposes. It includes various products and services.`,
      NextStep: 'Follow up with decision maker',
      CreatedDate: new Date(Date.now() - index * 86400000).toISOString(),
      LastModifiedDate: new Date().toISOString()
    };
  }

  generateMockCase(index) {
    const subjects = ['Login Issue', 'Performance Problem', 'Feature Request', 'Bug Report', 'Account Question'];
    const statuses = ['New', 'In Progress', 'Pending', 'Resolved', 'Closed'];
    const priorities = ['High', 'Medium', 'Low'];
    const origins = ['Email', 'Web', 'Phone', 'Chat'];
    
    return {
      Id: `case_${Date.now()}_${index}`,
      Subject: `${subjects[index % subjects.length]} ${index}`,
      Description: `This is a detailed description of case ${index}. The customer is experiencing issues with the system and needs assistance.`,
      Status: statuses[index % statuses.length],
      Priority: priorities[index % priorities.length],
      Origin: origins[index % origins.length],
      Type: ['Problem', 'Question', 'Feature Request'][index % 3],
      Reason: ['User Error', 'System Issue', 'Enhancement', 'Training'][index % 4],
      CreatedDate: new Date(Date.now() - index * 86400000).toISOString(),
      LastModifiedDate: new Date().toISOString()
    };
  }

  generateMockGeneric(index) {
    return {
      Id: `generic_${Date.now()}_${index}`,
      Name: `Generic Record ${index}`,
      Description: `This is a generic record ${index} for testing purposes`,
      Status: 'Active',
      CreatedDate: new Date(Date.now() - index * 86400000).toISOString(),
      LastModifiedDate: new Date().toISOString()
    };
  }

  // Placeholder methods for webhook processing
  async syncToSource(integration, recordData) {
    console.log(`Syncing to source: ${integration.sourceOrg.name}`);
    await this.delay(300);
    return { message: 'Synced to source successfully', sourceRecordId: `source_${Date.now()}` };
  }

  async getTargetRecord(sourceRecordId, integration) {
    console.log(`Finding target record for: ${sourceRecordId}`);
    await this.delay(100);
    
    // Simulate finding target record
    return {
      id: `target_${sourceRecordId}`,
      lastModified: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    };
  }

  async createTargetRecord(mappedData, integration) {
    console.log(`Creating target record in: ${integration.targetOrg.name}`);
    await this.delay(200);
    return `created_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async updateTargetRecord(targetRecordId, mappedData, integration) {
    console.log(`Updating target record: ${targetRecordId}`);
    await this.delay(150);
    return { id: targetRecordId, updated: true };
  }

  async deleteTargetRecord(targetRecordId, integration) {
    console.log(`Deleting target record: ${targetRecordId}`);
    await this.delay(100);
    return { id: targetRecordId, type: 'soft', deleted: true };
  }

  async detectUpdateConflicts(mappedData, targetRecord, integration) {
    // Simulate conflict detection
    await this.delay(50);
    return Math.random() < 0.1 ? [{ type: 'UPDATE_CONFLICT', field: 'LastModifiedDate' }] : [];
  }
}

module.exports = new IntegrationService();