# Hybrid Plan: Unified Policy & Guide Integration

## Overview

This document outlines a hybrid approach for integrating both policy and guide content within the iSPoC Policy Assistant, maintaining clear type distinctions while providing a unified search and display experience.

## Search & Discovery Integration

### Unified Search with Type Differentiation

- Implement a single search interface that queries both indexes simultaneously
- Display unified results with clear visual indicators for each content type
- Allow post-search filtering by content type (Policies/Guides/All)
- Preserve relevance ranking while respecting content type

### Pre-filtered Navigation Options

- Provide tabbed interface allowing users to pre-filter by content type
- Include "All Content" as the default tab
- Secondary navigation showing popular/recent items from each category
- Context-aware suggestions based on user's role and history

## Visual Distinction Framework

### Content Card Design

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

## Content Hierarchy & Structure

### Policy Response Structure

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

### Guide Response Structure

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

## Technical Implementation

### Backend Structure

- Maintain separate indexes for clean data organization
- Create unified API endpoints that query both sources
- Implement content-type field for filtering and display logic
- Preserve specialized metadata fields unique to each content type

### Performance Considerations

- Implement caching strategy to minimize duplicate queries
- Optimize search performance with content type hints
- Consider pre-generating common cross-content relationships
- Implement pagination that respects type filtering

## User Experience Benefits

- Users don't need to know content classification upfront
- "One search box" simplicity reduces cognitive load
- Clear visual distinction prevents confusion
- Filtering options provide user control
- Relationships between policies and guides can be explicitly shown

## Implementation Phases

1. **Phase 1:** Maintain separate indexes with unified search results
2. **Phase 2:** Implement visual distinction framework
3. **Phase 3:** Add filters and tabs for content type selection
4. **Phase 4:** Develop relationship mapping between related policies and guides
5. **Phase 5:** Implement user feedback and refinement

## Conclusion

The hybrid approach balances technical architecture concerns with user experience needs, providing the best of both worlds: clean, separated data management with a unified, intuitive interface for end users.
