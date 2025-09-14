// AI Service for Multi-Org Integration Platform
// Free Implementation using rule-based AI simulation

class AIService {
  constructor() {
    this.fieldMappingRules = this.initializeFieldMappingRules();
    this.conflictResolutionRules = this.initializeConflictResolutionRules();
  }

  // Initialize field mapping rules (simulates AI learning)
  initializeFieldMappingRules() {
    return {
      // Common field mappings across Salesforce objects
      'Account': {
        'Name': ['Name', 'AccountName', 'Company', 'CompanyName'],
        'Phone': ['Phone', 'PhoneNumber', 'MainPhone', 'CompanyPhone'],
        'Email': ['Email', 'EmailAddress', 'PrimaryEmail'],
        'Website': ['Website', 'WebsiteURL', 'CompanyWebsite'],
        'Industry': ['Industry', 'IndustryType', 'BusinessType'],
        'BillingStreet': ['BillingStreet', 'Street', 'Address1', 'AddressLine1'],
        'BillingCity': ['BillingCity', 'City', 'Location'],
        'BillingState': ['BillingState', 'State', 'StateProvince'],
        'BillingPostalCode': ['BillingPostalCode', 'PostalCode', 'ZipCode', 'Zip'],
        'BillingCountry': ['BillingCountry', 'Country'],
        'AnnualRevenue': ['AnnualRevenue', 'Revenue', 'YearlyRevenue'],
        'NumberOfEmployees': ['NumberOfEmployees', 'EmployeeCount', 'StaffSize']
      },
      'Contact': {
        'FirstName': ['FirstName', 'FName', 'GivenName'],
        'LastName': ['LastName', 'LName', 'Surname', 'FamilyName'],
        'Email': ['Email', 'EmailAddress', 'PrimaryEmail', 'WorkEmail'],
        'Phone': ['Phone', 'PhoneNumber', 'WorkPhone', 'BusinessPhone'],
        'MobilePhone': ['MobilePhone', 'Mobile', 'CellPhone', 'PersonalPhone'],
        'Title': ['Title', 'JobTitle', 'Position', 'Role'],
        'Department': ['Department', 'Dept', 'Division'],
        'MailingStreet': ['MailingStreet', 'Street', 'Address1'],
        'MailingCity': ['MailingCity', 'City'],
        'MailingState': ['MailingState', 'State'],
        'MailingPostalCode': ['MailingPostalCode', 'PostalCode', 'ZipCode'],
        'MailingCountry': ['MailingCountry', 'Country']
      },
      'Lead': {
        'FirstName': ['FirstName', 'FName', 'GivenName'],
        'LastName': ['LastName', 'LName', 'Surname'],
        'Email': ['Email', 'EmailAddress', 'ContactEmail'],
        'Phone': ['Phone', 'PhoneNumber', 'ContactPhone'],
        'Company': ['Company', 'CompanyName', 'Organization'],
        'Title': ['Title', 'JobTitle', 'Position'],
        'Industry': ['Industry', 'IndustryType'],
        'Status': ['Status', 'LeadStatus', 'Stage'],
        'Rating': ['Rating', 'Priority', 'Score'],
        'LeadSource': ['LeadSource', 'Source', 'Origin'],
        'Street': ['Street', 'Address1', 'AddressLine1'],
        'City': ['City', 'Location'],
        'State': ['State', 'StateProvince'],
        'PostalCode': ['PostalCode', 'ZipCode', 'Zip'],
        'Country': ['Country']
      },
      'Opportunity': {
        'Name': ['Name', 'OpportunityName', 'DealName'],
        'Amount': ['Amount', 'Value', 'DealValue', 'Revenue'],
        'CloseDate': ['CloseDate', 'ExpectedCloseDate', 'TargetDate'],
        'StageName': ['StageName', 'Stage', 'Status'],
        'Probability': ['Probability', 'WinProbability', 'Likelihood'],
        'Type': ['Type', 'OpportunityType', 'DealType'],
        'LeadSource': ['LeadSource', 'Source', 'Origin'],
        'Description': ['Description', 'Notes', 'Details'],
        'NextStep': ['NextStep', 'NextAction', 'FollowUp']
      },
      'Case': {
        'Subject': ['Subject', 'Title', 'Summary'],
        'Description': ['Description', 'Details', 'Issue'],
        'Status': ['Status', 'CaseStatus', 'State'],
        'Priority': ['Priority', 'Urgency', 'Severity'],
        'Origin': ['Origin', 'Source', 'Channel'],
        'Type': ['Type', 'CaseType', 'Category'],
        'Reason': ['Reason', 'CaseReason', 'IssueType']
      }
    };
  }

  // Initialize conflict resolution rules
  initializeConflictResolutionRules() {
    return {
      'dataTypes': {
        'String': {
          'merge': (source, target) => source && target ? `${source} | ${target}` : source || target,
          'source_wins': (source, target) => source,
          'target_wins': (source, target) => target,
          'latest_wins': (source, target, sourceTime, targetTime) => 
            sourceTime > targetTime ? source : target
        },
        'Number': {
          'merge': (source, target) => Math.max(source || 0, target || 0),
          'source_wins': (source, target) => source,
          'target_wins': (source, target) => target,
          'latest_wins': (source, target, sourceTime, targetTime) => 
            sourceTime > targetTime ? source : target
        },
        'Date': {
          'merge': (source, target) => source > target ? source : target,
          'source_wins': (source, target) => source,
          'target_wins': (source, target) => target,
          'latest_wins': (source, target, sourceTime, targetTime) => 
            sourceTime > targetTime ? source : target
        },
        'Boolean': {
          'merge': (source, target) => source || target,
          'source_wins': (source, target) => source,
          'target_wins': (source, target) => target,
          'latest_wins': (source, target, sourceTime, targetTime) => 
            sourceTime > targetTime ? source : target
        }
      },
      'fieldPriority': {
        'Email': 'high',
        'Phone': 'high',
        'Name': 'high',
        'Amount': 'high',
        'CloseDate': 'high',
        'Description': 'medium',
        'Notes': 'low'
      }
    };
  }

  // Generate field mappings using AI simulation
  async generateFieldMappings(sourceObjectType, targetObjectType) {
    try {
      console.log(`Generating AI field mappings: ${sourceObjectType} -> ${targetObjectType}`);
      
      // Simulate AI processing delay
      await this.simulateProcessingDelay(500);
      
      const sourceMappings = this.fieldMappingRules[sourceObjectType] || {};
      const targetMappings = this.fieldMappingRules[targetObjectType] || {};
      
      const fieldMappings = [];
      
      // Generate mappings based on field similarity
      for (const [sourceField, possibleMatches] of Object.entries(sourceMappings)) {
        for (const [targetField, targetPossibleMatches] of Object.entries(targetMappings)) {
          const confidence = this.calculateFieldSimilarity(
            sourceField, 
            targetField, 
            possibleMatches, 
            targetPossibleMatches
          );
          
          if (confidence > 0.7) {
            fieldMappings.push({
              sourceField,
              targetField,
              transformationRule: this.generateTransformationRule(sourceField, targetField),
              aiConfidence: confidence,
              reasoning: this.generateMappingReasoning(sourceField, targetField, confidence)
            });
          }
        }
      }
      
      // Add cross-object mappings if different object types
      if (sourceObjectType !== targetObjectType) {
        fieldMappings.push(...this.generateCrossObjectMappings(sourceObjectType, targetObjectType));
      }
      
      // Sort by confidence (highest first)
      fieldMappings.sort((a, b) => b.aiConfidence - a.aiConfidence);
      
      return fieldMappings.slice(0, 20); // Limit to top 20 mappings
      
    } catch (error) {
      console.error('Error generating field mappings:', error);
      return this.getFallbackMappings(sourceObjectType, targetObjectType);
    }
  }

  // Calculate field similarity confidence
  calculateFieldSimilarity(sourceField, targetField, sourcePossibleMatches = [], targetPossibleMatches = []) {
    let confidence = 0;
    
    // Exact match
    if (sourceField.toLowerCase() === targetField.toLowerCase()) {
      confidence = 1.0;
    }
    // Check if target field is in source possible matches
    else if (sourcePossibleMatches.some(match => 
      match.toLowerCase() === targetField.toLowerCase())) {
      confidence = 0.95;
    }
    // Check if source field is in target possible matches
    else if (targetPossibleMatches.some(match => 
      match.toLowerCase() === sourceField.toLowerCase())) {
      confidence = 0.95;
    }
    // Substring match
    else if (sourceField.toLowerCase().includes(targetField.toLowerCase()) ||
             targetField.toLowerCase().includes(sourceField.toLowerCase())) {
      confidence = 0.8;
    }
    // Levenshtein distance
    else {
      const distance = this.calculateLevenshteinDistance(
        sourceField.toLowerCase(), 
        targetField.toLowerCase()
      );
      const maxLength = Math.max(sourceField.length, targetField.length);
      confidence = Math.max(0, 1 - (distance / maxLength));
    }
    
    return Math.round(confidence * 100) / 100; // Round to 2 decimal places
  }

  // Calculate Levenshtein distance
  calculateLevenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // Generate transformation rule
  generateTransformationRule(sourceField, targetField) {
    // Check for common transformation patterns
    if (sourceField.includes('Phone') && targetField.includes('Phone')) {
      return 'formatPhone(value)';
    }
    if (sourceField.includes('Email') && targetField.includes('Email')) {
      return 'normalizeEmail(value)';
    }
    if (sourceField.includes('Date') && targetField.includes('Date')) {
      return 'formatDate(value)';
    }
    if (sourceField.includes('Amount') || sourceField.includes('Revenue')) {
      return 'formatCurrency(value)';
    }
    if (sourceField.includes('Name') && targetField.includes('Name')) {
      return 'normalizeName(value)';
    }
    
    return 'directMapping(value)';
  }

  // Generate mapping reasoning
  generateMappingReasoning(sourceField, targetField, confidence) {
    if (confidence >= 0.95) {
      return `High confidence mapping based on exact field name match or semantic equivalence`;
    } else if (confidence >= 0.8) {
      return `Good confidence mapping based on field name similarity and context`;
    } else if (confidence >= 0.7) {
      return `Moderate confidence mapping based on partial field name similarity`;
    } else {
      return `Low confidence mapping - manual review recommended`;
    }
  }

  // Generate cross-object mappings
  generateCrossObjectMappings(sourceObjectType, targetObjectType) {
    const crossMappings = [];
    
    // Common cross-object mappings
    const commonMappings = {
      'Lead->Contact': [
        { sourceField: 'FirstName', targetField: 'FirstName', aiConfidence: 1.0 },
        { sourceField: 'LastName', targetField: 'LastName', aiConfidence: 1.0 },
        { sourceField: 'Email', targetField: 'Email', aiConfidence: 1.0 },
        { sourceField: 'Phone', targetField: 'Phone', aiConfidence: 1.0 },
        { sourceField: 'Title', targetField: 'Title', aiConfidence: 0.9 }
      ],
      'Lead->Account': [
        { sourceField: 'Company', targetField: 'Name', aiConfidence: 0.95 },
        { sourceField: 'Phone', targetField: 'Phone', aiConfidence: 0.9 },
        { sourceField: 'Industry', targetField: 'Industry', aiConfidence: 1.0 }
      ],
      'Contact->Lead': [
        { sourceField: 'FirstName', targetField: 'FirstName', aiConfidence: 1.0 },
        { sourceField: 'LastName', targetField: 'LastName', aiConfidence: 1.0 },
        { sourceField: 'Email', targetField: 'Email', aiConfidence: 1.0 },
        { sourceField: 'Phone', targetField: 'Phone', aiConfidence: 1.0 }
      ]
    };
    
    const mappingKey = `${sourceObjectType}->${targetObjectType}`;
    const reverseMappingKey = `${targetObjectType}->${sourceObjectType}`;
    
    if (commonMappings[mappingKey]) {
      crossMappings.push(...commonMappings[mappingKey].map(mapping => ({
        ...mapping,
        transformationRule: this.generateTransformationRule(mapping.sourceField, mapping.targetField),
        reasoning: 'Cross-object mapping based on standard Salesforce field relationships'
      })));
    } else if (commonMappings[reverseMappingKey]) {
      // Reverse the mapping
      crossMappings.push(...commonMappings[reverseMappingKey].map(mapping => ({
        sourceField: mapping.targetField,
        targetField: mapping.sourceField,
        aiConfidence: mapping.aiConfidence * 0.9, // Slightly lower confidence for reverse mapping
        transformationRule: this.generateTransformationRule(mapping.targetField, mapping.sourceField),
        reasoning: 'Reverse cross-object mapping based on standard Salesforce field relationships'
      })));
    }
    
    return crossMappings;
  }

  // Resolve conflicts using AI simulation
  async resolveConflicts(conflicts, resolutionStrategy = 'ai-resolve') {
    try {
      console.log(`Resolving ${conflicts.length} conflicts using strategy: ${resolutionStrategy}`);
      
      // Simulate AI processing delay
      await this.simulateProcessingDelay(300);
      
      const resolutions = [];
      
      for (const conflict of conflicts) {
        const resolution = await this.resolveIndividualConflict(conflict, resolutionStrategy);
        resolutions.push(resolution);
      }
      
      return {
        strategy: resolutionStrategy,
        totalConflicts: conflicts.length,
        resolvedConflicts: resolutions.filter(r => r.resolved).length,
        resolutions,
        confidence: this.calculateOverallConfidence(resolutions),
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error resolving conflicts:', error);
      return {
        strategy: 'fallback',
        totalConflicts: conflicts.length,
        resolvedConflicts: 0,
        resolutions: [],
        confidence: 0,
        error: error.message
      };
    }
  }

  // Resolve individual conflict
  async resolveIndividualConflict(conflict, strategy) {
    const { field, sourceValue, targetValue, dataType = 'String' } = conflict;
    
    try {
      let resolvedValue;
      let confidence;
      let reasoning;
      
      if (strategy === 'ai-resolve') {
        // AI-based resolution logic
        const fieldPriority = this.conflictResolutionRules.fieldPriority[field] || 'medium';
        
        if (fieldPriority === 'high') {
          // For high priority fields, use more sophisticated logic
          resolvedValue = await this.resolveHighPriorityField(field, sourceValue, targetValue, dataType);
          confidence = 0.9;
          reasoning = `AI resolved high-priority field using advanced conflict resolution`;
        } else {
          // Use rule-based resolution
          const resolutionMethod = this.conflictResolutionRules.dataTypes[dataType]?.merge || 
                                  this.conflictResolutionRules.dataTypes['String'].merge;
          resolvedValue = resolutionMethod(sourceValue, targetValue);
          confidence = 0.8;
          reasoning = `AI resolved using data type-specific merge strategy`;
        }
      } else {
        // Use specified strategy
        const resolutionMethod = this.conflictResolutionRules.dataTypes[dataType]?.[strategy.replace('-', '_')] ||
                                this.conflictResolutionRules.dataTypes['String'][strategy.replace('-', '_')];
        resolvedValue = resolutionMethod(sourceValue, targetValue);
        confidence = 0.7;
        reasoning = `Resolved using ${strategy} strategy`;
      }
      
      return {
        field,
        sourceValue,
        targetValue,
        resolvedValue,
        strategy,
        confidence,
        reasoning,
        resolved: true,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        field,
        sourceValue,
        targetValue,
        resolvedValue: sourceValue, // Fallback to source value
        strategy: 'fallback',
        confidence: 0.5,
        reasoning: `Fallback resolution due to error: ${error.message}`,
        resolved: false,
        error: error.message
      };
    }
  }

  // Resolve high priority fields
  async resolveHighPriorityField(field, sourceValue, targetValue, dataType) {
    // Simulate advanced AI logic for high priority fields
    if (field.includes('Email')) {
      // For emails, prefer the one that looks more complete/valid
      const sourceValid = this.validateEmail(sourceValue);
      const targetValid = this.validateEmail(targetValue);
      
      if (sourceValid && !targetValid) return sourceValue;
      if (!sourceValid && targetValid) return targetValue;
      if (sourceValid && targetValid) {
        // Return the more recently used one (simulated by length)
        return sourceValue.length >= targetValue.length ? sourceValue : targetValue;
      }
    }
    
    if (field.includes('Phone')) {
      // For phones, prefer the more complete number
      const sourceDigits = (sourceValue || '').replace(/\D/g, '').length;
      const targetDigits = (targetValue || '').replace(/\D/g, '').length;
      
      return sourceDigits >= targetDigits ? sourceValue : targetValue;
    }
    
    if (field.includes('Name')) {
      // For names, prefer the more complete one
      return (sourceValue || '').length >= (targetValue || '').length ? sourceValue : targetValue;
    }
    
    // Default: return source value
    return sourceValue;
  }

  // Validate email format
  validateEmail(email) {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Calculate overall confidence
  calculateOverallConfidence(resolutions) {
    if (resolutions.length === 0) return 0;
    
    const totalConfidence = resolutions.reduce((sum, resolution) => sum + resolution.confidence, 0);
    return Math.round((totalConfidence / resolutions.length) * 100) / 100;
  }

  // Get fallback mappings
  getFallbackMappings(sourceObjectType, targetObjectType) {
    return [
      {
        sourceField: 'Id',
        targetField: 'External_Id__c',
        transformationRule: 'directMapping(value)',
        aiConfidence: 0.9,
        reasoning: 'Fallback mapping for record identification'
      },
      {
        sourceField: 'Name',
        targetField: 'Name',
        transformationRule: 'directMapping(value)',
        aiConfidence: 0.8,
        reasoning: 'Fallback mapping for primary name field'
      }
    ];
  }

  // Simulate processing delay (for realistic AI feel)
  async simulateProcessingDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Analyze data entities (simulate AWS Comprehend)
  async analyzeEntities(text) {
    if (!text || text.length < 10) {
      return { entities: [] };
    }
    
    // Simulate entity detection
    const entities = [];
    
    // Email detection
    const emailMatches = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
    if (emailMatches) {
      emailMatches.forEach(email => {
        entities.push({
          Text: email,
          Type: 'EMAIL',
          Score: 0.95
        });
      });
    }
    
    // Phone detection
    const phoneMatches = text.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g);
    if (phoneMatches) {
      phoneMatches.forEach(phone => {
        entities.push({
          Text: phone,
          Type: 'PHONE',
          Score: 0.9
        });
      });
    }
    
    // Organization detection (simple heuristic)
    const orgKeywords = ['Inc', 'Corp', 'LLC', 'Ltd', 'Company', 'Corporation'];
    orgKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        entities.push({
          Text: keyword,
          Type: 'ORGANIZATION',
          Score: 0.8
        });
      }
    });
    
    return { entities };
  }

  // Analyze sentiment (simulate AWS Comprehend)
  async analyzeSentiment(text) {
    if (!text || text.length < 10) {
      return { sentiment: 'NEUTRAL', score: 0.5 };
    }
    
    // Simple sentiment analysis based on keywords
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'poor', 'worst', 'horrible'];
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });
    
    let sentiment = 'NEUTRAL';
    let score = 0.5;
    
    if (positiveCount > negativeCount) {
      sentiment = 'POSITIVE';
      score = Math.min(0.5 + (positiveCount * 0.1), 0.95);
    } else if (negativeCount > positiveCount) {
      sentiment = 'NEGATIVE';
      score = Math.max(0.5 - (negativeCount * 0.1), 0.05);
    }
    
    return { sentiment, score };
  }
}

module.exports = new AIService();