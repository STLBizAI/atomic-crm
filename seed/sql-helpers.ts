// Helpers for turning JS values into Postgres SQL literals for demo-seed.ts.

export function sqlString(value: string | null | undefined): string {
  if (value === null || value === undefined) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

export function sqlNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "NULL";
  }
  return String(value);
}

export function sqlBoolean(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return "NULL";
  return value ? "true" : "false";
}

export function sqlJsonb(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

export function sqlJson(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  return `${sqlString(JSON.stringify(value))}::json`;
}

export function sqlBigIntArray(values: number[] | null | undefined): string {
  if (!values || values.length === 0) return "ARRAY[]::bigint[]";
  return `ARRAY[${values.join(",")}]::bigint[]`;
}

export function sqlRow(values: string[]): string {
  return `  (${values.join(", ")})`;
}
