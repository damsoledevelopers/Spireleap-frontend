# Common Components Documentation

This directory contains reusable components used across the entire project for consistent UI/UX.

## Components

### 1. PageHeader
Standardized page header with title, subtitle, back button, and action buttons.

**Usage:**
```jsx
import { PageHeader } from '@/components/Common'

<PageHeader
  title="Properties"
  subtitle="Manage all properties"
  backUrl="/admin/dashboard"
  actions={[
    <Link href="/add">Add New</Link>,
    <Button>Export</Button>
  ]}
  showBackButton={true}
/>
```

### 2. DataTable
Reusable table component with sorting, pagination, and customizable columns.

**Usage:**
```jsx
import { DataTable } from '@/components/Common'

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { 
    key: 'status', 
    label: 'Status',
    render: (value) => <Badge>{value}</Badge>
  }
]

<DataTable
  columns={columns}
  data={items}
  loading={loading}
  emptyMessage="No items found"
  actions={(row) => (
    <ActionButtons
      viewUrl={`/view/${row.id}`}
      editUrl={`/edit/${row.id}`}
      onDelete={() => handleDelete(row.id)}
    />
  )}
/>
```

### 3. FormSection
Container for form sections with consistent styling.

**Usage:**
```jsx
import { FormSection } from '@/components/Common'
import { Building } from 'lucide-react'

<FormSection title="Basic Information" icon={Building}>
  <FormField label="Name" name="name" value={formData.name} onChange={handleChange} />
</FormSection>
```

### 4. FormField
Standardized form input field with validation and error display.

**Usage:**
```jsx
import { FormField } from '@/components/Common'

<FormField
  label="Email"
  name="email"
  type="email"
  value={formData.email}
  onChange={(e) => setFormData({...formData, email: e.target.value})}
  required
  error={errors.email}
  helpText="Enter a valid email address"
/>

// Select field
<FormField
  label="Status"
  name="status"
  type="select"
  value={formData.status}
  onChange={(e) => setFormData({...formData, status: e.target.value})}
  options={[
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ]}
/>
```

### 5. DetailView
Standardized detail/view page layout.

**Usage:**
```jsx
import { DetailView } from '@/components/Common'

<DetailView
  title="Property Title"
  subtitle="Property details"
  image="/path/to/image.jpg"
  sections={[
    {
      title: "Basic Information",
      icon: Building,
      fields: [
        { label: "Price", value: "$500,000" },
        { label: "Location", value: "Miami, FL" }
      ]
    }
  ]}
  actions={[
    <Button>Edit</Button>,
    <Button>Delete</Button>
  ]}
/>
```

### 6. SearchAndFilters
Search bar and filter controls.

**Usage:**
```jsx
import { SearchAndFilters } from '@/components/Common'

<SearchAndFilters
  onSearch={(term) => handleSearch(term)}
  filters={[
    {
      key: 'status',
      type: 'select',
      value: filters.status,
      options: [
        { value: '', label: 'All Status' },
        { value: 'active', label: 'Active' }
      ]
    }
  ]}
  onFilterChange={(key, value) => setFilters({...filters, [key]: value})}
  searchPlaceholder="Search..."
/>
```

### 7. ActionButtons
Standardized action buttons (View, Edit, Delete, etc.)

**Usage:**
```jsx
import { ActionButtons } from '@/components/Common'

<ActionButtons
  viewUrl="/view/123"
  editUrl="/edit/123"
  onDelete={() => handleDelete(123)}
  onApprove={() => handleApprove(123)}
  onReject={() => handleReject(123)}
  showView={true}
  showEdit={true}
  showDelete={true}
/>
```

### 8. Pagination
Reusable pagination component.

**Usage:**
```jsx
import { Pagination } from '@/components/Common'

<Pagination
  current={currentPage}
  total={totalItems}
  limit={itemsPerPage}
  onPageChange={(page) => setCurrentPage(page)}
  showInfo={true}
/>
```

## Benefits

1. **Consistency**: All pages use the same components for consistent UI
2. **Maintainability**: Update once, applies everywhere
3. **Reusability**: Write once, use everywhere
4. **Sorting**: Built-in table sorting logic
5. **Responsive**: All components are mobile-friendly
6. **Accessible**: Proper ARIA labels and keyboard navigation

## Implementation Checklist

When creating a new module (Properties, Leads, Users, etc.):

- [ ] Use `PageHeader` for page title and actions
- [ ] Use `DataTable` for list views
- [ ] Use `FormSection` and `FormField` for add/edit forms
- [ ] Use `DetailView` for detail/view pages
- [ ] Use `SearchAndFilters` for search and filtering
- [ ] Use `ActionButtons` for row actions
- [ ] Use `Pagination` for paginated lists

