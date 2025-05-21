/// <reference types="vite/client" />

declare module '*.md?raw' {
  const content: string;
  export default content;
}

declare module '*.md?raw&t=1' {
  const content: string;
  export default content;
}

declare module '*.md?raw&t=2' {
  const content: string;
  export default content;
}
