# MUI to Bootstrap Component Mapping

This guide maps Material-UI components to Bootstrap equivalents for the migration.

## Layout Components

### Box → div with utility classes
```tsx
// MUI
<Box sx={{ p: 2, mb: 3 }}>Content</Box>

// Bootstrap
<div className="p-2 mb-3">Content</div>
```

### Stack → div with flex utilities
```tsx
// MUI
<Stack spacing={2} direction="row">
  <Item1 />
  <Item2 />
</Stack>

// Bootstrap
<div className="d-flex gap-2">
  <Item1 />
  <Item2 />
</div>
```

### Container → div.container
```tsx
// MUI
<Container maxWidth="lg">Content</Container>

// Bootstrap
<div className="container-lg">Content</div>
```

## Typography

### Typography → HTML elements with Bootstrap classes
```tsx
// MUI
<Typography variant="h6">Title</Typography>
<Typography variant="body1">Text</Typography>

// Bootstrap
<h6>Title</h6>
<p>Text</p>
```

## Form Components

### TextField → div.form-group + input.form-control
```tsx
// MUI
<TextField label="Name" value={value} onChange={handleChange} />

// Bootstrap
<div className="mb-3">
  <label className="form-label">Name</label>
  <input
    type="text"
    className="form-control"
    value={value}
    onChange={handleChange}
  />
</div>
```

### Autocomplete → React Select (if available) or custom
```tsx
// For now, use basic select or keep as custom component
<select className="form-select">
  <option>Option 1</option>
</select>
```

## Buttons

### Button → button.btn
```tsx
// MUI
<Button variant="contained" color="primary">Click</Button>
<Button variant="outlined" color="secondary">Cancel</Button>

// Bootstrap
<button className="btn btn-primary">Click</button>
<button className="btn btn-outline-secondary">Cancel</button>
```

### IconButton → button.btn.btn-sm
```tsx
// MUI
<IconButton><EditIcon /></IconButton>

// Bootstrap
<button className="btn btn-sm btn-link p-1">
  <EditIcon />
</button>
```

## Feedback Components

### Alert → div.alert
```tsx
// MUI
<Alert severity="error">Error message</Alert>
<Alert severity="success">Success!</Alert>

// Bootstrap
<div className="alert alert-danger">Error message</div>
<div className="alert alert-success">Success!</div>
```

### CircularProgress → div.spinner-border
```tsx
// MUI
<CircularProgress />

// Bootstrap
<div className="spinner-border" role="status">
  <span className="visually-hidden">Loading...</span>
</div>
```

### LinearProgress → div.progress
```tsx
// MUI
<LinearProgress value={50} />

// Bootstrap
<div className="progress">
  <div className="progress-bar" style={{ width: '50%' }}></div>
</div>
```

## Display Components

### Card → div.card
```tsx
// MUI
<Card>
  <CardContent>Content</CardContent>
</Card>

// Bootstrap
<div className="card">
  <div className="card-body">Content</div>
</div>
```

### Chip → span.badge
```tsx
// MUI
<Chip label="Tag" color="primary" />

// Bootstrap
<span className="badge bg-primary">Tag</span>
```

### AppBar + Toolbar → nav.navbar
```tsx
// MUI
<AppBar position="static">
  <Toolbar>Content</Toolbar>
</AppBar>

// Bootstrap
<nav className="navbar navbar-light bg-light">
  <div className="container-fluid">Content</div>
</nav>
```

## Modal/Dialog Components

### Dialog/Modal → div.modal
```tsx
// MUI
<Dialog open={open} onClose={handleClose}>
  <DialogTitle>Title</DialogTitle>
  <DialogContent>Content</DialogContent>
</Dialog>

// Bootstrap (use React Bootstrap Modal if available via PluginApi.libraries.Bootstrap)
const { Modal } = window.PluginApi.libraries.Bootstrap;

<Modal show={open} onHide={handleClose}>
  <Modal.Header closeButton>
    <Modal.Title>Title</Modal.Title>
  </Modal.Header>
  <Modal.Body>Content</Modal.Body>
</Modal>
```

## Utility Classes Reference

### Spacing
- `p-*` = padding (0-5)
- `m-*` = margin (0-5)
- `px-*`, `py-*`, `pt-*`, `pb-*`, etc.

### Display
- `d-flex` = display: flex
- `d-inline-flex` = display: inline-flex
- `d-none` = display: none

### Flex
- `flex-row`, `flex-column`
- `justify-content-*` (start, center, end, between, around)
- `align-items-*` (start, center, end, stretch)
- `gap-*` (1-5)

### Sizing
- `w-25`, `w-50`, `w-75`, `w-100` = width %
- `h-25`, `h-50`, `h-75`, `h-100` = height %

### Colors
- `text-primary`, `text-secondary`, `text-success`, `text-danger`
- `bg-primary`, `bg-secondary`, etc.

## Icons

MUI Icons can be replaced with:
1. FontAwesome (available via PluginApi.libraries.FontAwesomeSolid, etc.)
2. Bootstrap Icons (if needed, use inline SVG)
3. Simple HTML symbols

```tsx
// MUI
import { Edit as EditIcon } from '@mui/icons-material';

// FontAwesome via PluginApi
const { FontAwesomeIcon } = window.PluginApi.libraries.FontAwesome;
const { faEdit } = window.PluginApi.libraries.FontAwesomeSolid;

<FontAwesomeIcon icon={faEdit} />
```
