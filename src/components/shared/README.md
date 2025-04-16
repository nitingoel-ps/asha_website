# Shared Component Styling

This directory contains shared styling resources that can be used across the application.

## TabStyling.css

`TabStyling.css` provides consistent tab styling throughout the application. The file is already imported globally in the main App.js file, so you don't need to import it in individual components.

### ButtonGroup Tabs

All tabs in the application now use the ButtonGroup style for consistency. This approach provides a cleaner, more modern interface and works well on both mobile and desktop devices.

To implement tabs in a component:

```jsx
import { ButtonGroup, Button } from 'react-bootstrap';
import '../shared/TabStyling.css'; // Optional if it's already imported in App.js

function MyComponent() {
  const [activeTab, setActiveTab] = useState('tab1');
  
  return (
    <div>
      <div className="app-button-tabs">
        <ButtonGroup className="w-100">
          <Button 
            variant={activeTab === 'tab1' ? 'primary' : 'outline-primary'}
            onClick={() => setActiveTab('tab1')}
            className="flex-grow-1"
          >
            Tab 1
          </Button>
          <Button 
            variant={activeTab === 'tab2' ? 'primary' : 'outline-primary'}
            onClick={() => setActiveTab('tab2')}
            className="flex-grow-1"
          >
            Tab 2
          </Button>
        </ButtonGroup>
      </div>

      <div className="tab-content">
        {activeTab === 'tab1' && (
          <div>
            {/* Tab 1 content */}
          </div>
        )}
        {activeTab === 'tab2' && (
          <div>
            {/* Tab 2 content */}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Responsive Behavior

The ButtonGroup tabs are fully responsive and will adapt to mobile and desktop views. On mobile, the tabs will take up the full width of the screen and will stick to the top of the screen when scrolling for better usability.

### Custom Content Containers

You can still use custom container classes for the content of each tab by placing them inside the conditional rendering blocks:

```jsx
{activeTab === 'tab1' && (
  <div className="custom-tab-content">
    {/* Your custom styled content */}
  </div>
)}
```

## Usage Examples

For examples of usage, check these components:
- `src/components/AddProviders.js`
- `src/components/PatientDashboard/NewMedications/MedicationsListView.js`
- `src/components/HealthPriorities/HealthPriorities.js` 