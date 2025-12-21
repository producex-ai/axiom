# Document Editor Architecture

## Overview

The document editor has been completely refactored with a focus on:
- **Production-ready code quality** using TypeScript best practices
- **Shadcn UI integration** for consistent, accessible components
- **AI-powered editing** with multiple transformation categories
- **Modular architecture** for maintainability and extensibility
- **Excellent UX** with intuitive toolbars, floating menus, and toast notifications

## Architecture

### Component Structure

```
components/editor/
├── DocumentEditor.tsx        # Main editor component (orchestrates everything)
├── FormattingToolbar.tsx     # Rich text formatting controls
├── AIToolbar.tsx             # AI assistant dropdown menu
├── FloatingAIMenu.tsx        # Context-aware AI widget on text selection
└── index.ts                  # Public exports

hooks/
├── use-editor-toolbar.ts     # Editor state management hook
└── use-editor-ai.ts          # AI operations hook with loading states

lib/editor/
├── types.ts                  # TypeScript interfaces and types
└── constants.ts              # AI categories, block types, etc.
```

### Core Features

#### 1. DocumentEditor Component
**Location**: `components/editor/DocumentEditor.tsx`

**Responsibilities**:
- TipTap editor initialization with extensions (StarterKit, Placeholder, FileHandler)
- Content synchronization (HTML ↔ Markdown via converters)
- View/Edit mode management
- SSR-safe rendering with `immediatelyRender: false`
- Prose styling for beautiful document formatting

**Props**:
```typescript
{
  documentId: string;           // For API calls
  documentTitle: string;        // Used in AI prompts
  initialContent?: string;      // HTML content
  readOnly?: boolean;           // View mode
  onChange?: (content: string) => void;
  showToolbar?: boolean;        // Show formatting toolbar
  showAI?: boolean;             // Enable AI features
  placeholder?: string;
}
```

#### 2. FormattingToolbar Component
**Location**: `components/editor/FormattingToolbar.tsx`

**Features**:
- Block type selector (Paragraph, H1-H6) using Shadcn Select
- Text formatting (Bold, Italic, Strike, Code) with ToggleGroup
- Lists (Bullet, Ordered, Blockquote)
- Utilities (Clear formatting, Horizontal rule)
- History (Undo/Redo) with disabled state management

**Design Pattern**: Uses `use-editor-toolbar` hook for reactive state management

#### 3. AIToolbar Component
**Location**: `components/editor/AIToolbar.tsx`

**Features**:
- Shadcn Popover for dropdown menu
- Shadcn Command component for searchable AI actions
- Visual feedback: purple theme, word count badge
- Loading state with spinner
- Grouped AI categories with descriptions

**AI Categories**:
1. **Edit & Review**: Improve writing, make shorter/longer, simplify, fix grammar
2. **Generate from Selection**: Summarize, continue writing, extract action items
3. **Change Tone**: Professional, casual, direct, confident, friendly
4. **Change Style**: Business, legal, technical, creative
5. **Translate**: English, Spanish, French, German, Chinese

#### 4. FloatingAIMenu Component
**Location**: `components/editor/FloatingAIMenu.tsx`

**UX Features**:
- Appears near selected text for contextual AI assistance
- Custom prompt input for flexible instructions
- Selected text preview with word count
- Quick action badges for common tasks
- Auto-dismisses on click outside or Escape key
- Beautiful animations with Tailwind

#### 5. Custom Hooks

**use-editor-toolbar** (`hooks/use-editor-toolbar.ts`):
- Reactive editor state (bold, italic, lists, headings, etc.)
- Current block type detection
- Block type setter with proper focus management
- Undo/Redo capability checks

**use-editor-ai** (`hooks/use-editor-ai.ts`):
- AI request handling with error boundaries
- Loading state management
- Text selection utilities
- Toast notifications (success/error)
- Automatic content replacement

### Data Flow

```
User Action
    ↓
DocumentEditor (orchestration)
    ↓
FormattingToolbar / AIToolbar (UI)
    ↓
use-editor-toolbar / use-editor-ai (logic)
    ↓
TipTap Editor (content manipulation)
    ↓
onChange callback (parent receives HTML)
```

### AI Integration

#### API Endpoint
**Location**: `app/api/bedrock/route.ts`

**Request**:
```json
{
  "instruction": "Document Title - User instruction",
  "text": "Selected text to transform"
}
```

**Response**:
```json
{
  "output": "Transformed text",
  "error": "Error message if failed"
}
```

#### AWS Bedrock Configuration
- Model: `anthropic.claude-3-5-sonnet-20240620-v1:0`
- Max tokens: 2048
- Region: us-east-1
- Uses Claude's advanced language understanding

### Document Conversion

**Location**: `lib/document-converters.ts`

**Flow**:
```
Storage (S3)
    ↓
DOCX file
    ↓
convertDocxToMarkdown() [mammoth, turndown]
    ↓
Markdown (version control friendly)
    ↓
convertMarkdownToHtml() [markdown-it]
    ↓
HTML (editor content)
    ↓
convertHtmlToMarkdown() [turndown]
    ↓
Markdown (for saving)
    ↓
convertMarkdownToDocx() [docx library]
    ↓
DOCX file → S3
```

### Styling Architecture

#### Prose Classes
Beautiful typography out-of-the-box:
- Responsive heading sizes (H1: 3xl, H2: 2xl, etc.)
- Proper spacing for paragraphs, lists, code blocks
- Styled blockquotes with left border
- Inline code with background highlighting
- Pre-formatted code blocks

#### Component Themes
- **Primary Actions**: Green theme (AI features)
- **Purple Accents**: AI assistant, special features
- **Consistent Shadcn**: Button variants, hover states, focus rings

### Error Handling

1. **Network Errors**: Toast notifications with specific messages
2. **AI Failures**: Graceful degradation, user-friendly errors
3. **Validation**: Text selection required before AI operations
4. **Loading States**: Disabled buttons, spinners, visual feedback

### Accessibility

- Proper ARIA labels on all toolbar buttons
- Keyboard navigation in Command menu
- Focus management after operations
- Screen reader friendly
- High contrast ratios

### Performance Optimizations

1. **Memoization**: `useMemo` for computed toolbar state
2. **Debouncing**: Not needed yet, but can add for onChange
3. **Lazy Loading**: Editor only renders on client
4. **Event Cleanup**: All useEffect hooks properly clean up listeners

### Migration from Old TipTapEditor

**Old Issues Fixed**:
- ❌ Hardcoded API keys in comments → ✅ Removed
- ❌ Duplicate AI functionality → ✅ Single source of truth in hooks
- ❌ Inconsistent API paths → ✅ Unified `/api/bedrock`
- ❌ Alert() for errors → ✅ Toast notifications
- ❌ Inline styles → ✅ Tailwind classes
- ❌ MUI icons → ✅ Lucide React
- ❌ Poor TypeScript → ✅ Strict types, no any
- ❌ Commented code → ✅ Clean, production-ready

### Usage Example

```tsx
import { DocumentEditor } from "@/components/editor";

function MyPage() {
  const [content, setContent] = useState("");

  return (
    <DocumentEditor
      documentId="doc-123"
      documentTitle="Compliance Framework"
      initialContent={content}
      onChange={setContent}
      showToolbar={true}
      showAI={true}
      placeholder="Start writing..."
    />
  );
}
```

### Testing Strategy

1. **Unit Tests**: Hooks and utilities
2. **Integration Tests**: Component interactions
3. **E2E Tests**: Full editing workflow
4. **AI Tests**: Mock Bedrock responses

### Future Enhancements

1. **Collaboration**: Real-time multiplayer editing with Yjs
2. **Comments**: Thread-based discussions on selections
3. **Version History**: Visual diff viewer
4. **Templates**: Pre-built document templates
5. **Export Options**: PDF, HTML, Markdown downloads
6. **Image Handling**: Proper upload to S3, not base64
7. **Tables**: Rich table editing support
8. **Mentions**: @user and #tag support
9. **Slash Commands**: /ai, /heading, /list, etc.
10. **Mobile**: Touch-optimized toolbar

### Dependencies

```json
{
  "@tiptap/react": "^3.14.0",
  "@tiptap/starter-kit": "^3.14.0",
  "@tiptap/extension-placeholder": "^3.14.0",
  "@tiptap/extension-file-handler": "^3.14.0",
  "@radix-ui/react-popover": "latest",
  "@radix-ui/react-command": "latest",
  "@radix-ui/react-toggle-group": "latest",
  "sonner": "latest",
  "lucide-react": "latest"
}
```

## Conclusion

This architecture prioritizes:
- **Developer Experience**: Clear separation of concerns, TypeScript safety
- **User Experience**: Intuitive UI, fast feedback, beautiful design
- **Maintainability**: Modular components, reusable hooks
- **Scalability**: Easy to add new AI features, toolbar actions
- **Production Quality**: Error handling, accessibility, performance

The editor is now a **surreal experience** with seamless AI integration that feels like magic. ✨
