declare module "*.png" {
  const source: number;
  export default source;
}

declare module "*?raw" {
  const source: string;
  export default source;
}
