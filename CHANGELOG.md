# Changelog

All notable changes to Lektr Web App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-02-03

### Added

#### Flashcard System

- **Deck Management** - Create, edit, and delete flashcard decks
- **Flashcard Creation** - Create basic and cloze-deletion flashcards from highlights
- **Study Sessions** - FSRS-based spaced repetition study mode with keyboard shortcuts
- **Virtual Cards** - Raw highlights can be reviewed as virtual flashcards

#### Book Study Mode

- **Frictionless Book Review** - Study a book's highlights directly without creating a deck first
- **Smart Review Button** - Dynamic button showing due card count on book page
- **Book Study Stats API** - New endpoints `GET /books/{id}/study` and `GET /books/{id}/study-stats`

#### Library Enhancements

- **Bulk Selection** - Select multiple books with checkboxes for batch operations
- **Bulk Tagging** - Tag multiple books at once
- **List View** - New compact list view option alongside grid view
- **Library Filters** - Dedicated filter component with tag filtering

#### UI Components

- **Digital Spine Covers** - Beautiful procedurally-generated book cover placeholders
- **Scroll-to-Highlight** - Clicking "Open in Book" from flashcard scrolls to and highlights the source passage
- **Search Highlighting** - Search terms highlighted within highlight cards
- **Contextual Card Labels** - Virtual cards show "Preview" / "Full Highlight" instead of "Question" / "Answer"

### Changed

- **Book Detail Page** - Redesigned with streamlined header, sticky search bar, and improved tag display
- **Book Covers** - Now use `BookCover` component with fallback to `DigitalSpineCover`
- **Navbar** - Updated navigation structure
- **Review Page** - Improved review interface

#### API Documentation

- **100% OpenAPI Coverage** - Migrated all legacy routes (Covers, Settings, Admin, Export) to OpenAPI format
- **Swagger UI** - Complete API documentation with schemas and examples at `/docs`

### Fixed

- Book cover placeholder not displaying correctly
- Search input icon overlap on book detail page
- Virtual card review error in book study mode

---

## [0.1.0] - Initial Release

### Added

- Book library with import from Kindle, Kobo, and browser extension
- Highlight management with notes
- Tag system for organization
- Search across all highlights
- Export functionality
- User authentication
- Settings management
