public class IntegrationEventPublisher {
    
    public static void publishSyncEvent(IntegrationConfig__c config, IntegrationProcessor.IntegrationResult result) {
        try {
            IntegrationSyncEvent__e syncEvent = new IntegrationSyncEvent__e();
            syncEvent.SourceOrg__c = config.SourceOrg__c;
            syncEvent.TargetOrg__c = config.TargetOrg__c;
            syncEvent.ObjectType__c = config.ObjectMapping__c;
            syncEvent.Status__c = result.success ? 'Success' : 'Failed';
            syncEvent.RecordsProcessed__c = result.recordsProcessed;
            syncEvent.RecordsSucceeded__c = result.recordsSucceeded;
            syncEvent.RecordsFailed__c = result.recordsFailed;
            syncEvent.ProcessingTime__c = result.processingTime;
            syncEvent.IntegrationId__c = result.integrationId;
            syncEvent.ErrorMessage__c = result.errorMessage;
            
            EventBus.publish(syncEvent);
            
        } catch (Exception ex) {
            IntegrationLogger.logError('IntegrationEventPublisher.publishSyncEvent', ex);
        }
    }
    
    public static void publishBatchSyncEvents(List<IntegrationSyncEventData> eventData) {
        try {
            List<IntegrationSyncEvent__e> events = new List<IntegrationSyncEvent__e>();
            
            for (IntegrationSyncEventData data : eventData) {
                IntegrationSyncEvent__e syncEvent = new IntegrationSyncEvent__e();
                syncEvent.SourceOrg__c = data.sourceOrg;
                syncEvent.TargetOrg__c = data.targetOrg;
                syncEvent.ObjectType__c = data.objectType;
                syncEvent.Status__c = data.status;
                syncEvent.RecordsProcessed__c = data.recordsProcessed;
                syncEvent.RecordsSucceeded__c = data.recordsSucceeded;
                syncEvent.RecordsFailed__c = data.recordsFailed;
                syncEvent.ProcessingTime__c = data.processingTime;
                syncEvent.IntegrationId__c = data.integrationId;
                syncEvent.ErrorMessage__c = data.errorMessage;
                
                events.add(syncEvent);
            }
            
            if (!events.isEmpty()) {
                List<Database.SaveResult> results = EventBus.publish(events);
                
                // Log any publish failures
                for (Database.SaveResult result : results) {
                    if (!result.isSuccess()) {
                        for (Database.Error error : result.getErrors()) {
                            IntegrationLogger.logError('IntegrationEventPublisher.publishBatchSyncEvents', 
                                new IntegrationException(error.getMessage()));
                        }
                    }
                }
            }
            
        } catch (Exception ex) {
            IntegrationLogger.logError('IntegrationEventPublisher.publishBatchSyncEvents', ex);
        }
    }
    
    public static void publishHealthCheckEvent(String orgId, String status, String details) {
        try {
            IntegrationSyncEvent__e healthEvent = new IntegrationSyncEvent__e();
            healthEvent.SourceOrg__c = orgId;
            healthEvent.TargetOrg__c = 'HEALTH_CHECK';
            healthEvent.ObjectType__c = 'System';
            healthEvent.Status__c = status;
            healthEvent.RecordsProcessed__c = 1;
            healthEvent.RecordsSucceeded__c = status == 'Success' ? 1 : 0;
            healthEvent.RecordsFailed__c = status == 'Failed' ? 1 : 0;
            healthEvent.ErrorMessage__c = details;
            healthEvent.IntegrationId__c = 'HEALTH_' + DateTime.now().getTime();
            
            EventBus.publish(healthEvent);
            
        } catch (Exception ex) {
            IntegrationLogger.logError('IntegrationEventPublisher.publishHealthCheckEvent', ex);
        }
    }
    
    public static void publishDataChangeEvent(String sourceOrg, String objectType, String recordId, String changeType) {
        try {
            IntegrationSyncEvent__e changeEvent = new IntegrationSyncEvent__e();
            changeEvent.SourceOrg__c = sourceOrg;
            changeEvent.TargetOrg__c = 'ALL';
            changeEvent.ObjectType__c = objectType;
            changeEvent.Status__c = 'In Progress';
            changeEvent.RecordsProcessed__c = 1;
            changeEvent.IntegrationId__c = 'CHANGE_' + recordId + '_' + DateTime.now().getTime();
            changeEvent.ErrorMessage__c = 'Data Change: ' + changeType + ' on record ' + recordId;
            
            EventBus.publish(changeEvent);
            
        } catch (Exception ex) {
            IntegrationLogger.logError('IntegrationEventPublisher.publishDataChangeEvent', ex);
        }
    }
    
    @future
    public static void publishAsyncSyncEvent(String configId, String resultJson) {
        try {
            IntegrationConfig__c config = [
                SELECT SourceOrg__c, TargetOrg__c, ObjectMapping__c
                FROM IntegrationConfig__c
                WHERE Id = :configId
                LIMIT 1
            ];
            
            IntegrationProcessor.IntegrationResult result = 
                (IntegrationProcessor.IntegrationResult) JSON.deserialize(resultJson, IntegrationProcessor.IntegrationResult.class);
            
            publishSyncEvent(config, result);
            
        } catch (Exception ex) {
            IntegrationLogger.logError('IntegrationEventPublisher.publishAsyncSyncEvent', ex);
        }
    }
    
    // Data class for batch events
    public class IntegrationSyncEventData {
        public String sourceOrg;
        public String targetOrg;
        public String objectType;
        public String status;
        public Integer recordsProcessed;
        public Integer recordsSucceeded;
        public Integer recordsFailed;
        public Long processingTime;
        public String integrationId;
        public String errorMessage;
    }
    
    // Custom exception
    public class IntegrationException extends Exception {}
}