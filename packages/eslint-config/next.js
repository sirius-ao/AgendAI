import core from 'eslint-config-next/core-web-vitals';
import ts from 'eslint-config-next/typescript';
export default [...core, ...ts, { ignores: ['.next/**', 'next-env.d.ts'] }];
