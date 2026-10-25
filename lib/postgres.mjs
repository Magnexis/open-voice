// Netlify Database exposes a pg.Pool; using its parameterized query API also reports affected rows.
export function createPostgresRepository(client) {
  return {async query(sql, params=[]) {
    let i=0;
    const statement=sql.replace(/\?/g,()=>`$${++i}`);
    const result=await client.pool.query(statement,params);
    return /^\s*(SELECT|WITH)/i.test(sql)||/\bRETURNING\b/i.test(sql)?result.rows:{changes:result.rowCount};
  }};
}
