# Component: Button

## 1. Inputs/Props

| Prop | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| `variant` | `string` | Style: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`. | `default` |
| `size` | `string` | Size: `default`, `sm`, `lg`, `icon`. | `default` |
| `asChild` | `boolean` | Render as a child of its parent component. | `false` |
| `...props` | `object` | Other props passed to the underlying `<button>` element. | |

## 2. Outputs

Renders a `<button>` element.

## 3. Dependencies

*   **External Libs:** `react`, `@radix-ui/react-slot`, `class-variance-authority`.
*   **Internal Utils:** `lib/utils.js`.
