public with sharing class IntegrationConfigService {
    
    public static IntegrationConfig__c getActiveConfig(String sourceOrg, String targetOrg, String objectType) {
        try {
            List<IntegrationConfig__c> configs = [
                SELECT Id, Name, SourceOrg__c, TargetOrg__c, ObjectMapping__c, 
                       FieldMapping__c, ConflictResolution__c, IsActive__c, 
                       LastSyncTime__c, SuccessRate__c
                FROM IntegrationConfig__c
                WHERE SourceOrg__c = :sourceOrg 
                AND TargetOrg__c = :targetOrg 
                AND ObjectMapping__c = :objectType
                AND IsActive__c = true
                LIMIT 1
            ];
            
            return configs.isEmpty() ? null : configs[0];
        } catch (Exception ex) {
            IntegrationLogger.logError('IntegrationConfigService.getActiveConfig', ex);
            return null;
        }
    }
    
    public static List<IntegrationConfig__c> getConfigs(String sourceOrg, String targetOrg) {
        try {
            return [
                SELECT Id, Name, SourceOrg__c, TargetOrg__c, ObjectMapping__c, 
                       FieldMapping__c, ConflictResolution__c, IsActive__c, 
                       LastSyncTime__c, SuccessRate__c, CreatedDate
                FROM IntegrationConfig__c
                WHERE SourceOrg__c = :sourceOrg 
                AND TargetOrg__c = :targetOrg
                ORDER BY CreatedDate DESC
            ];
        } catch (Exception ex) {
            IntegrationLogger.logError('IntegrationConfigService.getConfigs', ex);
            return new List<IntegrationConfig__c>();
        }
    }
    
    public static IntegrationConfig__c updateConfig(String configId, Boolean isActive, 
                                                   String fieldMapping, String conflictResolution) {
        try {
            IntegrationConfig__c config = [
                SELECT Id, FieldMapping__c, ConflictResolution__c, IsActive__c
                FROM IntegrationConfig__c
                WHERE Id = :configId
                LIMIT 1
            ];
            
            if (isActive != null) config.IsActive__c = isActive;
            if (String.isNotBlank(fieldMapping)) config.FieldMapping__c = fieldMapping;
            if (String.isNotBlank(conflictResolution)) config.ConflictResolution__c = conflictResolution;
            
            update config;
            return config;
            
        } catch (Exception ex) {
            IntegrationLogger.logError('IntegrationConfigService.updateConfig', ex);
            return null;
        }
    }
    
    public static IntegrationLog__c getIntegrationLog(String integrationId) {
        try {
            List<IntegrationLog__c> logs = [
                SELECT Id, Integration__c, Status__c, RecordsProcessed__c, 
                       RecordsSucceeded__c, RecordsFailed__c, ErrorDetails__c, 
                       CreatedDate, ProcessingTime__c
                FROM IntegrationLog__c
                WHERE Id = :integrationId
                LIMIT 1
            ];
            
            return logs.isEmpty() ? null : logs[0];
        } catch (Exception ex) {
            IntegrationLogger.logError('IntegrationConfigService.getIntegrationLog', ex);
            return null;
        }
    }
    
    public static Integer getTotalSyncs(String sourceOrg, String targetOrg) {
        try {
            List<AggregateResult> results = [
                SELECT COUNT(Id) totalSyncs
                FROM IntegrationLog__c
                WHERE Integration__r.SourceOrg__c = :sourceOrg
                AND Integration__r.TargetOrg__c = :targetOrg
            ];
            
            return results.isEmpty() ? 0 : Integer.valueOf(results[0].get('totalSyncs'));
        } catch (Exception ex) {
            IntegrationLogger.logError('IntegrationConfigService.getTotalSyncs', ex);
            return 0;
        }
    }
    
    public static Decimal getSuccessRate(String sourceOrg, String targetOrg) {
        try {
            List<AggregateResult> results = [
                SELECT COUNT(Id) totalSyncs, 
                       COUNT_CONDITIONAL(CASE WHEN Status__c = 'Success' THEN 1 END) successfulSyncs
                FROM IntegrationLog__c
                WHERE Integration__r.SourceOrg__c = :sourceOrg
                AND Integration__r.TargetOrg__c = :targetOrg
            ];
            
            if (results.isEmpty()) return 0;
            
            Integer total = Integer.valueOf(results[0].get('totalSyncs'));
            Integer successful = Integer.valueOf(results[0].get('successfulSyncs'));
            
            return total > 0 ? (successful * 100.0 / total).setScale(2) : 0;
        } catch (Exception ex) {
            IntegrationLogger.logError('IntegrationConfigService.getSuccessRate', ex);
            return 0;
        }
    }
    
    public static List<IntegrationHealth> getIntegrationHealth() {
        List<IntegrationHealth> healthList = new List<IntegrationHealth>();
        
        try {
            List<AggregateResult> results = [
                SELECT Integration__r.SourceOrg__c sourceOrg,
                       Integration__r.TargetOrg__c targetOrg,
                       Integration__r.ObjectMapping__c objectType,
                       COUNT(Id) totalSyncs,
                       MAX(CreatedDate) lastSync,
                       AVG(ProcessingTime__c) avgProcessingTime
                FROM IntegrationLog__c
                WHERE CreatedDate = LAST_N_DAYS:7
                GROUP BY Integration__r.SourceOrg__c, Integration__r.TargetOrg__c, 
                         Integration__r.ObjectMapping__c
            ];
            
            for (AggregateResult result : results) {
                IntegrationHealth health = new IntegrationHealth();
                health.sourceOrg = (String) result.get('sourceOrg');
                health.targetOrg = (String) result.get('targetOrg');
                health.objectType = (String) result.get('objectType');
                health.totalSyncs = Integer.valueOf(result.get('totalSyncs'));
                health.lastSync = (DateTime) result.get('lastSync');
                health.avgProcessingTime = (Decimal) result.get('avgProcessingTime');
                healthList.add(health);
            }
            
        } catch (Exception ex) {
            IntegrationLogger.logError('IntegrationConfigService.getIntegrationHealth', ex);
        }
        
        return healthList;
    }
    
    public class IntegrationHealth {
        @AuraEnabled public String sourceOrg;
        @AuraEnabled public String targetOrg;
        @AuraEnabled public String objectType;
        @AuraEnabled public Integer totalSyncs;
        @AuraEnabled public DateTime lastSync;
        @AuraEnabled public Decimal avgProcessingTime;
    }
}