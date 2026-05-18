# Components

This folder contains reusable React components for the FINX application.

## Structure

- **Common**: Shared components used across multiple pages (Button, Input, Modal, etc.)
- **Layout**: Layout components (Header, Sidebar, Footer, etc.)
- **Forms**: Form-related components (FormInput, FormSelect, etc.)
- **Dashboard**: Dashboard-specific components

## Guidelines

- Keep components focused and single-responsibility
- Use TypeScript for type safety
- Props should be properly typed
- Export components from index.ts
- Follow the naming convention: PascalCase

## Example

```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ variant = 'primary', children, ...props }: ButtonProps) {
  return (
    <button className={`btn-${variant}`} {...props}>
      {children}
    </button>
  );
}
```
