/// <reference types="vite/client" />

// Declare SVG imports
declare module '*.svg' {
  const content: string;
  export default content;
}

// Declare image imports
declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

// Declare inline CSS imports (Vite ?inline suffix)
declare module '*.css?inline' {
  const content: string;
  export default content;
}
