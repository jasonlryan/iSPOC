# UI Styling Guide: Policy vs Guide Responses

## Visual Distinction Framework

### Content Card Base Design

**Policy Cards:**

- Primary color accent: Deep blue (#1A365D)
- Icon: Document/clipboard icon
- Header style: Bold, uppercase title with policy ID
- Tag/badge: "POLICY" in compact pill format
- Border: Solid 2px border

**Guide Cards:**

- Primary color accent: Forest green (#2D6A4F)
- Icon: Lightbulb/steps icon
- Header style: Sentence case with guide number
- Tag/badge: "GUIDE" in compact pill format
- Border: Dashed 2px border

## Information Hierarchy

**Policy Response Structure:**

- Title
- Policy ID/Reference
- Description (formal, authoritative tone)
- Key sections with collapsible details:
  - Purpose
  - Scope
  - Responsibilities
  - Procedures
- Related policies
- Metadata (last updated, owner)

**Guide Response Structure:**

- Title with action-oriented phrasing
- Visual step indicators (1-2-3)
- Description (conversational, instructional tone)
- Sections presented as:
  - Overview/Introduction
  - Step-by-step instructions with visual cues
  - Troubleshooting tips
  - Examples/Screenshots
- Related guides
- Estimated completion time

## Typography & Content Styling

**Policy Content:**

- Headings: Serif or formal sans-serif
- Body text: Slightly smaller, higher density
- Formatting: More structured with formal bullet points, numbering
- Quote style: Indented with left border for important provisions

**Guide Content:**

- Headings: Friendly sans-serif
- Body text: Slightly larger, more spacing
- Formatting: Visual checkmarks, progress indicators
- Quote style: Highlighted boxes for tips and warnings

## Interactive Elements

**Policy Interactions:**

- Expandable sections for detailed provisions
- Definition tooltips for technical terms
- Document download option
- Print-friendly formatting
- Version history access

**Guide Interactions:**

- Interactive checklists
- Enlarged step images on click
- "Mark as complete" functionality
- Quick navigation between steps
- Feedback mechanism ("Was this helpful?")

## Responsive Considerations

Both types should adapt to mobile formats, but:

**Policy Mobile View:**

- Prioritize full content access
- Collapsible sections
- Reference preservation

**Guide Mobile View:**

- Focus on current step visibility
- Swipe navigation between steps
- Simplified visual elements

## Search Result Differentiation

When displayed in search results:

- Clear visual distinction using the color scheme
- Policy results: More formal excerpt with reference number
- Guide results: Action-oriented excerpt with step preview
- Different icon sets for immediate visual categorization
- Sort options that respect the different content types

## Implementation Examples

### Policy Card Example

```html
<div class="content-card policy-card">
  <div class="card-header policy-header">
    <span class="content-badge policy-badge">POLICY</span>
    <h3 class="policy-title">WHISTLEBLOWING POLICY</h3>
    <span class="policy-id">HR-POL-123</span>
  </div>
  <div class="card-body">
    <p class="policy-description">
      This policy outlines the procedures for reporting workplace concerns...
    </p>
    <div class="section-container">
      <div class="section-title">Purpose</div>
      <div class="section-content">...</div>
    </div>
    <!-- Additional sections -->
    <div class="metadata">
      <span class="updated-date">Last updated: 15 Mar 2023</span>
      <span class="owner">Owner: HR Department</span>
    </div>
  </div>
</div>
```

### Guide Card Example

```html
<div class="content-card guide-card">
  <div class="card-header guide-header">
    <span class="content-badge guide-badge">GUIDE</span>
    <h3 class="guide-title">How to reset your MHA password</h3>
    <span class="guide-number">Guide #15</span>
  </div>
  <div class="card-body">
    <p class="guide-description">
      Follow these steps to quickly reset your password...
    </p>
    <div class="step-container">
      <div class="step-indicator">Step 1</div>
      <div class="step-content">
        Navigate to the login page and click "Forgot Password"...
      </div>
    </div>
    <!-- Additional steps -->
    <div class="guide-meta">
      <span class="completion-time">Estimated time: 5 minutes</span>
      <div class="was-helpful">
        <span>Was this helpful?</span>
        <button class="thumb-up">👍</button>
        <button class="thumb-down">👎</button>
      </div>
    </div>
  </div>
</div>
```

## CSS Variables

```css
:root {
  /* Policy-specific variables */
  --policy-primary: #1a365d;
  --policy-secondary: #e2e8f0;
  --policy-border: solid 2px var(--policy-primary);

  /* Guide-specific variables */
  --guide-primary: #2d6a4f;
  --guide-secondary: #e8f5e9;
  --guide-border: dashed 2px var(--guide-primary);

  /* Typography */
  --policy-font-heading: "Georgia", serif;
  --guide-font-heading: "Open Sans", sans-serif;
  --body-font: "Roboto", sans-serif;
}
```

This styling guide provides a comprehensive approach to visually distinguish between policies and guides while maintaining a cohesive design system within the iSPoC Policy Assistant.
