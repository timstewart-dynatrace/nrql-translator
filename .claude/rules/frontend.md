# Frontend Development Standards

## React Principles

- **Single Responsibility:** Each component does one thing well
- **Composition:** Build complex UIs from simple components
- **Props Down, Events Up:** Data flows down, events flow up

## Strato Design System

This project uses Dynatrace's Strato Design System. Always import from category subpaths:

```typescript
// Correct
import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading } from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";

// Wrong — causes bundle issues
import { Flex, Heading, Button } from "@dynatrace/strato-components";
```

## Component Structure

Page-level components are thin composers — layout and composition only, minimal logic.

```typescript
// Translator.tsx — page component
export function TranslatorPage(): JSX.Element {
  // State and handlers
  return (
    <Flex>
      <InputSection />
      <OutputSection />
    </Flex>
  );
}
```

## State Management

- Use React `useState` / `useEffect` for local component state
- No external state management library needed for this project's scope
- Keep state as close to where it's used as possible

## Accessibility

- Use semantic HTML elements
- Provide `aria-label` for interactive elements without visible text
- Ensure keyboard navigation works for all interactive elements
