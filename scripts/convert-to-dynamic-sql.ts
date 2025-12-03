/**
 * Convert RLS Policies to Dynamic SQL
 * 
 * This script converts all CREATE POLICY statements to use EXECUTE format()
 * to avoid parse-time validation of view references.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

function convertPolicyToDynamicSQL(policySQL: string, tableName: string): string {
  // Extract policy name
  const policyNameMatch = policySQL.match(/CREATE POLICY IF NOT EXISTS (\w+)/);
  if (!policyNameMatch) return policySQL;
  
  const policyName = policyNameMatch[1];
  
  // Extract operation type
  const operationMatch = policySQL.match(/FOR (SELECT|INSERT|UPDATE|DELETE)/);
  if (!operationMatch) return policySQL;
  
  const operation = operationMatch[1];
  
  // Extract USING or WITH CHECK clause
  const usingMatch = policySQL.match(/USING\s*\((.*?)\);?$/s);
  const checkMatch = policySQL.match(/WITH CHECK\s*\((.*?)\);?$/s);
  
  const condition = usingMatch ? usingMatch[1].trim() : (checkMatch ? checkMatch[1].trim() : 'true');
  
  // Build dynamic SQL
  if (usingMatch) {
    return `    EXECUTE format('
      CREATE POLICY IF NOT EXISTS ${policyName} ON %I
        FOR ${operation}
        USING (%s);
    ', '${tableName}', '${condition.replace(/'/g, "''").replace(/"/g, '\\"')}');`;
  } else if (checkMatch) {
    return `    EXECUTE format('
      CREATE POLICY IF NOT EXISTS ${policyName} ON %I
        FOR ${operation}
        WITH CHECK (%s);
    ', '${tableName}', '${condition.replace(/'/g, "''").replace(/"/g, '\\"')}');`;
  }
  
  return policySQL;
}

console.log('Dynamic SQL conversion script - Manual implementation needed');



