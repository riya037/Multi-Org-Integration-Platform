public class IntegrationProcessor {
    private IntegrationConfig__c config;
    private Map<String, String> fieldMappings;
    private String conflictResolution;
    
    public IntegrationProcessor(IntegrationConfig__c config) {
        this.config = config;
        this.fieldMappings = parseFieldMappings(config.FieldMapping__c);
        this.conflictResolution = config.ConflictResolution__c;
    }
    
    public IntegrationResult processRecords(List<Object> sourceRecords) {
        IntegrationResult result = new IntegrationResult();
        result.integrationId = generateIntegrationId();
        List<SObject> recordsToUpsert = new List<SObject>();
        List<String> errors = new List<String>();
        
        DateTime startTime = DateTime.now();
        
        try {
            String targetObjectType = config.ObjectMapping__c;
            Schema.SObjectType targetType = Schema.getGlobalDescribe().get(targetObjectType);
            
            if (targetType == null) {
                result.success = false;
                result.errorMessage = 'Invalid target object type: ' + targetObjectType;
                return result;
            }
            
            for (Object sourceRecord : sourceRecords) {
                try {
                    Map<String, Object> sourceData = (Map<String, Object>) sourceRecord;
                    SObject targetRecord = processIndividualRecord(sourceData, targetType);
                    
                    if (targetRecord != null) {
                        recordsToUpsert.add(targetRecord);
                    }
                    
                } catch (Exception ex) {
                    errors.add('Record processing failed: ' + ex.getMessage());
                    result.recordsFailed++;
                }
            }
            
            if (!recordsToUpsert.isEmpty()) {
                UpsertResult upsertResult = performBulkUpsert(recordsToUpsert);
                result.recordsSucceeded += upsertResult.successCount;
                result.recordsFailed += upsertResult.failureCount;
                errors.addAll(upsertResult.errors);
            }
            
            result.recordsProcessed = sourceRecords.size();
            result.processingTime = DateTime.now().getTime() - startTime.getTime();
            result.success = result.recordsFailed == 0;
            result.errorMessage = errors.isEmpty() ? null : String.join(errors, '; ');
            
            updateConfigSuccessRate(result);
            
        } catch (Exception ex) {
            result.success = false;
            result.errorMessage = 'Integration processing failed: ' + ex.getMessage();
            result.processingTime = DateTime.now().getTime() - startTime.getTime();
            IntegrationLogger.logError('IntegrationProcessor.processRecords', ex);
        }
        
        return result;
    }
    
    private SObject processIndividualRecord(Map<String, Object> sourceData, Schema.SObjectType targetType) {
        try {
            SObject targetRecord = targetType.newSObject();
            
            for (String sourceField : fieldMappings.keySet()) {
                String targetField = fieldMappings.get(sourceField);
                Object value = sourceData.get(sourceField);
                
                if (value != null && hasField(targetType, targetField)) {
                    Object convertedValue = convertFieldValue(value, targetField, targetType);
                    targetRecord.put(targetField, convertedValue);
                }
            }
            
            String externalIdField = getExternalIdField(targetType);
            if (String.isNotBlank(externalIdField) && sourceData.containsKey('Id')) {
                targetRecord.put(externalIdField, sourceData.get('Id'));
            }
            
            if (conflictResolution == 'SOURCE_WINS') {
                return targetRecord;
            } else if (conflictResolution == 'TARGET_WINS') {
                return handleTargetWinsConflict(targetRecord, targetType);
            } else if (conflictResolution == 'LATEST_WINS') {
                return handleLatestWinsConflict(targetRecord, sourceData, targetType);
            }
            
            return targetRecord;
            
        } catch (Exception ex) {
            IntegrationLogger.logError('IntegrationProcessor.processIndividualRecord', ex);
            throw ex;
        }
    }
    
    private UpsertResult performBulkUpsert(List<SObject> records) {
        UpsertResult result = new UpsertResult();
        
        try {
            List<Database.UpsertResult> upsertResults = Database.upsert(records, false);
            
            for (Database.UpsertResult upsertResult : upsertResults) {
                if (upsertResult.isSuccess()) {
                    result.successCount++;
                } else {
                    result.failureCount++;
                    for (Database.Error error : upsertResult.getErrors()) {
                        result.errors.add(error.getMessage());
                    }
                }
            }
            
        } catch (Exception ex) {
            result.failureCount = records.size();
            result.errors.add('Bulk upsert failed: ' + ex.getMessage());
            IntegrationLogger.logError('IntegrationProcessor.performBulkUpsert', ex);
        }
        
        return result;
    }
    
    private Map<String, String> parseFieldMappings(String fieldMappingJson) {
        Map<String, String> mappings = new Map<String, String>();
        
        try {
            if (String.isNotBlank(fieldMappingJson)) {
                Map<String, Object> mappingData = (Map<String, Object>) JSON.deserializeUntyped(fieldMappingJson);
                for (String key : mappingData.keySet()) {
                    mappings.put(key, String.valueOf(mappingData.get(key)));
                }
            }
        } catch (Exception ex) {
            IntegrationLogger.logError('IntegrationProcessor.parseFieldMappings', ex);
        }
        
        return mappings;
    }
    
    private Object convertFieldValue(Object value, String fieldName, Schema.SObjectType targetType) {
        try {
            Schema.DescribeFieldResult fieldDesc = targetType.getDescribe().fields.getMap()
                .get(fieldName).getDescribe();
            Schema.DisplayType fieldType = fieldDesc.getType();
            
            switch on fieldType {
                when INTEGER {
                    return value instanceof Integer ? value : Integer.valueOf(String.valueOf(value));
                }
                when DOUBLE, CURRENCY, PERCENT {
                    return value instanceof Decimal ? value : Decimal.valueOf(String.valueOf(value));
                }
                when DATE {
                    return value instanceof Date ? value : Date.valueOf(String.valueOf(value));
                }
                when DATETIME {
                    return value instanceof DateTime ? value : DateTime.valueOf(String.valueOf(value));
                }
                when BOOLEAN {
                    return value instanceof Boolean ? value : Boolean.valueOf(String.valueOf(value));
                }
                when else {
                    return String.valueOf(value);
                }
            }
        } catch (Exception ex) {
            IntegrationLogger.logError('IntegrationProcessor.convertFieldValue', ex);
            return value;
        }
    }
    
    private Boolean hasField(Schema.SObjectType objectType, String fieldName) {
        return objectType.getDescribe().fields.getMap().containsKey(fieldName);
    }
    
    private String getExternalIdField(Schema.SObjectType objectType) {
        Map<String, Schema.SObjectField> fieldMap = objectType.getDescribe().fields.getMap();
        
        for (String fieldName : fieldMap.keySet()) {
            Schema.DescribeFieldResult fieldDesc = fieldMap.get(fieldName).getDescribe();
            if (fieldDesc.isExternalId()) {
                return fieldName;
            }
        }
        
        return null;
    }
    
    private SObject handleTargetWinsConflict(SObject targetRecord, Schema.SObjectType targetType) {
        return targetRecord;
    }
    
    private SObject handleLatestWinsConflict(SObject targetRecord, Map<String, Object> sourceData, Schema.SObjectType targetType) {
        return targetRecord;
    }
    
    private void updateConfigSuccessRate(IntegrationResult result) {
        try {
            Decimal currentRate = config.SuccessRate__c != null ? config.SuccessRate__c : 0;
            Decimal newRate = result.success ? 100 : 0;
            
            config.SuccessRate__c = (currentRate + newRate) / 2;
            config.LastSyncTime__c = DateTime.now();
            
            update config;
        } catch (Exception ex) {
            IntegrationLogger.logError('IntegrationProcessor.updateConfigSuccessRate', ex);
        }
    }
    
    private String generateIntegrationId() {
        return String.valueOf(DateTime.now().getTime()) + '_' + 
               String.valueOf(Math.random() * 1000).substring(0, 3);
    }
    
    public class IntegrationResult {
        public Boolean success = false;
        public Integer recordsProcessed = 0;
        public Integer recordsSucceeded = 0;
        public Integer recordsFailed = 0;
        public String errorMessage;
        public String integrationId;
        public Long processingTime;
    }
    
    private class UpsertResult {
        public Integer successCount = 0;
        public Integer failureCount = 0;
        public List<String> errors = new List<String>();
    }
}