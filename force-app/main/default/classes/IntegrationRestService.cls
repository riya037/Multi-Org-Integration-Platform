@RestResource(urlMapping='/api/integration/*')
global class IntegrationRestService {
    
    @HttpPost
    global static IntegrationResponse syncData() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        IntegrationResponse response = new IntegrationResponse();
        
        try {
            String requestBody = req.requestBody.toString();
            Map<String, Object> requestData = (Map<String, Object>) JSON.deserializeUntyped(requestBody);
            
            // Extract integration parameters
            String sourceOrg = (String) requestData.get('sourceOrg');
            String targetOrg = (String) requestData.get('targetOrg');
            String objectType = (String) requestData.get('objectType');
            List<Object> records = (List<Object>) requestData.get('records');
            
            // Validate required parameters
            if (String.isBlank(sourceOrg) || String.isBlank(targetOrg) || String.isBlank(objectType)) {
                response.success = false;
                response.errorMessage = 'Missing required parameters: sourceOrg, targetOrg, objectType';
                res.statusCode = 400;
                return response;
            }
            
            // Get integration configuration
            IntegrationConfig__c config = IntegrationConfigService.getActiveConfig(sourceOrg, targetOrg, objectType);
            if (config == null) {
                response.success = false;
                response.errorMessage = 'No active integration configuration found';
                res.statusCode = 404;
                return response;
            }
            
            // Process data synchronization
            IntegrationProcessor processor = new IntegrationProcessor(config);
            IntegrationResult result = processor.processRecords(records);
            
            // Update response
            response.success = result.success;
            response.recordsProcessed = result.recordsProcessed;
            response.recordsSucceeded = result.recordsSucceeded;
            response.recordsFailed = result.recordsFailed;
            response.errorMessage = result.errorMessage;
            response.integrationId = result.integrationId;
            
            // Log integration activity
            IntegrationLogger.logIntegration(config.Id, result);
            
            // Publish platform event for real-time monitoring
            IntegrationEventPublisher.publishSyncEvent(config, result);
            
            res.statusCode = result.success ? 200 : 500;
            
        } catch (Exception ex) {
            response.success = false;
            response.errorMessage = 'Integration failed: ' + ex.getMessage();
            res.statusCode = 500;
            
            // Log error
            IntegrationLogger.logError('IntegrationRestService.syncData', ex);
        }
        
        return response;
    }
    
    @HttpGet
    global static IntegrationStatusResponse getIntegrationStatus() {
        RestRequest req = RestContext.request;
        IntegrationStatusResponse response = new IntegrationStatusResponse();
        
        try {
            String integrationId = req.params.get('integrationId');
            String sourceOrg = req.params.get('sourceOrg');
            String targetOrg = req.params.get('targetOrg');
            
            if (String.isNotBlank(integrationId)) {
                // Get specific integration status
                IntegrationLog__c log = IntegrationConfigService.getIntegrationLog(integrationId);
                if (log != null) {
                    response.success = true;
                    response.status = log.Status__c;
                    response.recordsProcessed = Integer.valueOf(log.RecordsProcessed__c);
                    response.lastSyncTime = log.CreatedDate;
                    response.errorDetails = log.ErrorDetails__c;
                }
            } else if (String.isNotBlank(sourceOrg) && String.isNotBlank(targetOrg)) {
                // Get overall integration health
                List<IntegrationConfig__c> configs = IntegrationConfigService.getConfigs(sourceOrg, targetOrg);
                response.success = true;
                response.activeIntegrations = configs.size();
                response.totalSyncs = IntegrationConfigService.getTotalSyncs(sourceOrg, targetOrg);
                response.successRate = IntegrationConfigService.getSuccessRate(sourceOrg, targetOrg);
            }
            
        } catch (Exception ex) {
            response.success = false;
            response.errorMessage = ex.getMessage();
            IntegrationLogger.logError('IntegrationRestService.getIntegrationStatus', ex);
        }
        
        return response;
    }
    
    @HttpPut
    global static IntegrationResponse updateConfiguration() {
        RestRequest req = RestContext.request;
        IntegrationResponse response = new IntegrationResponse();
        
        try {
            String requestBody = req.requestBody.toString();
            Map<String, Object> configData = (Map<String, Object>) JSON.deserializeUntyped(requestBody);
            
            String configId = (String) configData.get('configId');
            Boolean isActive = (Boolean) configData.get('isActive');
            String fieldMapping = (String) configData.get('fieldMapping');
            String conflictResolution = (String) configData.get('conflictResolution');
            
            IntegrationConfig__c config = IntegrationConfigService.updateConfig(
                configId, isActive, fieldMapping, conflictResolution
            );
            
            if (config != null) {
                response.success = true;
                response.message = 'Configuration updated successfully';
            } else {
                response.success = false;
                response.errorMessage = 'Configuration not found or update failed';
            }
            
        } catch (Exception ex) {
            response.success = false;
            response.errorMessage = ex.getMessage();
            IntegrationLogger.logError('IntegrationRestService.updateConfiguration', ex);
        }
        
        return response;
    }
    
    // Response classes
    global class IntegrationResponse {
        public Boolean success;
        public String message;
        public String errorMessage;
        public Integer recordsProcessed;
        public Integer recordsSucceeded;
        public Integer recordsFailed;
        public String integrationId;
    }
    
    global class IntegrationStatusResponse {
        public Boolean success;
        public String status;
        public String errorMessage;
        public Integer recordsProcessed;
        public DateTime lastSyncTime;
        public String errorDetails;
        public Integer activeIntegrations;
        public Integer totalSyncs;
        public Decimal successRate;
    }
}