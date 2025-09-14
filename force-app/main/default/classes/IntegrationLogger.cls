public class IntegrationLogger {
    
    public static void logIntegration(Id configId, IntegrationProcessor.IntegrationResult result) {
        try {
            IntegrationLog__c log = new IntegrationLog__c();
            log.Integration__c = configId;
            log.Status__c = result.success ? 'Success' : 'Failed';
            log.RecordsProcessed__c = result.recordsProcessed;
            log.RecordsSucceeded__c = result.recordsSucceeded;
            log.RecordsFailed__c = result.recordsFailed;
            log.ProcessingTime__c = result.processingTime;
            log.ErrorDetails__c = result.errorMessage;
            log.IntegrationId__c = result.integrationId;
            
            insert log;
            
            // Clean up old logs (keep last 1000)
            cleanupOldLogs();
            
        } catch (Exception ex) {
            System.debug('Failed to log integration: ' + ex.getMessage());
        }
    }
    
    public static void logError(String className, Exception ex) {
        try {
            IntegrationLog__c errorLog = new IntegrationLog__c();
            errorLog.Status__c = 'Error';
            errorLog.ErrorDetails__c = className + ': ' + ex.getMessage() + '\n' + ex.getStackTraceString();
            errorLog.RecordsProcessed__c = 0;
            errorLog.RecordsSucceeded__c = 0;
            errorLog.RecordsFailed__c = 1;
            
            insert errorLog;
            
        } catch (Exception logEx) {
            System.debug('Failed to log error: ' + logEx.getMessage());
        }
    }
    
    public static void logApiCallout(String endpoint, String method, Integer responseCode, String responseBody) {
        try {
            IntegrationLog__c apiLog = new IntegrationLog__c();
            apiLog.Status__c = responseCode < 400 ? 'Success' : 'Failed';
            apiLog.ErrorDetails__c = 'API Callout - ' + method + ' ' + endpoint + 
                                   '\nResponse Code: ' + responseCode + 
                                   '\nResponse: ' + (responseBody != null ? responseBody.substring(0, Math.min(responseBody.length(), 32000)) : '');
            apiLog.RecordsProcessed__c = 1;
            apiLog.RecordsSucceeded__c = responseCode < 400 ? 1 : 0;
            apiLog.RecordsFailed__c = responseCode >= 400 ? 1 : 0;
            
            insert apiLog;
            
        } catch (Exception ex) {
            System.debug('Failed to log API callout: ' + ex.getMessage());
        }
    }
    
    public static List<IntegrationLogSummary> getIntegrationSummary(Integer days) {
        List<IntegrationLogSummary> summaries = new List<IntegrationLogSummary>();
        
        try {
            Date fromDate = Date.today().addDays(-days);
            
            List<AggregateResult> results = [
                SELECT Integration__r.SourceOrg__c sourceOrg,
                       Integration__r.TargetOrg__c targetOrg,
                       Integration__r.ObjectMapping__c objectType,
                       Status__c status,
                       COUNT(Id) totalCount,
                       SUM(RecordsProcessed__c) totalRecords,
                       AVG(ProcessingTime__c) avgProcessingTime,
                       MAX(CreatedDate) lastRun
                FROM IntegrationLog__c
                WHERE CreatedDate >= :fromDate
                AND Integration__c != null
                GROUP BY Integration__r.SourceOrg__c, Integration__r.TargetOrg__c, 
                         Integration__r.ObjectMapping__c, Status__c
            ];
            
            Map<String, IntegrationLogSummary> summaryMap = new Map<String, IntegrationLogSummary>();
            
            for (AggregateResult result : results) {
                String key = (String)result.get('sourceOrg') + '_' + 
                           (String)result.get('targetOrg') + '_' + 
                           (String)result.get('objectType');
                
                IntegrationLogSummary summary = summaryMap.get(key);
                if (summary == null) {
                    summary = new IntegrationLogSummary();
                    summary.sourceOrg = (String)result.get('sourceOrg');
                    summary.targetOrg = (String)result.get('targetOrg');
                    summary.objectType = (String)result.get('objectType');
                    summary.totalRuns = 0;
                    summary.successfulRuns = 0;
                    summary.failedRuns = 0;
                    summary.totalRecordsProcessed = 0;
                    summaryMap.put(key, summary);
                }
                
                String status = (String)result.get('status');
                Integer count = Integer.valueOf(result.get('totalCount'));
                Integer records = Integer.valueOf(result.get('totalRecords'));
                
                summary.totalRuns += count;
                summary.totalRecordsProcessed += records != null ? records : 0;
                
                if (status == 'Success') {
                    summary.successfulRuns += count;
                } else {
                    summary.failedRuns += count;
                }
                
                summary.avgProcessingTime = (Decimal)result.get('avgProcessingTime');
                summary.lastRun = (DateTime)result.get('lastRun');
            }
            
            summaries.addAll(summaryMap.values());
            
            // Calculate success rates
            for (IntegrationLogSummary summary : summaries) {
                if (summary.totalRuns > 0) {
                    summary.successRate = (summary.successfulRuns * 100.0 / summary.totalRuns).setScale(2);
                }
            }
            
        } catch (Exception ex) {
            logError('IntegrationLogger.getIntegrationSummary', ex);
        }
        
        return summaries;
    }
    
    public static List<ErrorSummary> getErrorSummary(Integer days) {
        List<ErrorSummary> errors = new List<ErrorSummary>();
        
        try {
            Date fromDate = Date.today().addDays(-days);
            
            List<AggregateResult> results = [
                SELECT Integration__r.SourceOrg__c sourceOrg,
                       Integration__r.TargetOrg__c targetOrg,
                       Integration__r.ObjectMapping__c objectType,
                       ErrorDetails__c errorType,
                       COUNT(Id) errorCount,
                       MAX(CreatedDate) lastOccurrence
                FROM IntegrationLog__c
                WHERE CreatedDate >= :fromDate
                AND Status__c = 'Failed'
                AND ErrorDetails__c != null
                GROUP BY Integration__r.SourceOrg__c, Integration__r.TargetOrg__c,
                         Integration__r.ObjectMapping__c, ErrorDetails__c
                HAVING COUNT(Id) > 1
                ORDER BY COUNT(Id) DESC
                LIMIT 50
            ];
            
            for (AggregateResult result : results) {
                ErrorSummary error = new ErrorSummary();
                error.sourceOrg = (String)result.get('sourceOrg');
                error.targetOrg = (String)result.get('targetOrg');
                error.objectType = (String)result.get('objectType');
                error.errorMessage = (String)result.get('errorType');
                error.errorCount = Integer.valueOf(result.get('errorCount'));
                error.lastOccurrence = (DateTime)result.get('lastOccurrence');
                errors.add(error);
            }
            
        } catch (Exception ex) {
            logError('IntegrationLogger.getErrorSummary', ex);
        }
        
        return errors;
    }
    
    public static void cleanupOldLogs() {
        try {
            // Delete logs older than 30 days, keep at least 1000 most recent
            List<IntegrationLog__c> oldLogs = [
                SELECT Id
                FROM IntegrationLog__c
                WHERE CreatedDate < LAST_N_DAYS:30
                ORDER BY CreatedDate DESC
                OFFSET 1000
                LIMIT 1000
            ];
            
            if (!oldLogs.isEmpty()) {
                delete oldLogs;
            }
            
        } catch (Exception ex) {
            System.debug('Failed to cleanup old logs: ' + ex.getMessage());
        }
    }
    
    @TestVisible
    private static void createTestLog(String status, String errorDetails) {
        IntegrationLog__c testLog = new IntegrationLog__c();
        testLog.Status__c = status;
        testLog.ErrorDetails__c = errorDetails;
        testLog.RecordsProcessed__c = 1;
        testLog.RecordsSucceeded__c = status == 'Success' ? 1 : 0;
        testLog.RecordsFailed__c = status == 'Failed' ? 1 : 0;
        
        insert testLog;
    }
    
    // Data classes
    public class IntegrationLogSummary {
        @AuraEnabled public String sourceOrg;
        @AuraEnabled public String targetOrg;
        @AuraEnabled public String objectType;
        @AuraEnabled public Integer totalRuns;
        @AuraEnabled public Integer successfulRuns;
        @AuraEnabled public Integer failedRuns;
        @AuraEnabled public Decimal successRate;
        @AuraEnabled public Integer totalRecordsProcessed;
        @AuraEnabled public Decimal avgProcessingTime;
        @AuraEnabled public DateTime lastRun;
    }
    
    public class ErrorSummary {
        @AuraEnabled public String sourceOrg;
        @AuraEnabled public String targetOrg;
        @AuraEnabled public String objectType;
        @AuraEnabled public String errorMessage;
        @AuraEnabled public Integer errorCount;
        @AuraEnabled public DateTime lastOccurrence;
    }
}