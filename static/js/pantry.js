document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const pantryItemsContainer = document.getElementById('pantry-items-container');
    const addPantryItemBtn = document.getElementById('add-pantry-item-btn');
    const addPantryModal = document.getElementById('add-pantry-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const closeModalX = addPantryModal.querySelector('.close');
    const pantryItemForm = document.getElementById('pantry-item-form');
    const modalTitle = document.getElementById('modal-title');
    const pantrySearch = document.getElementById('pantry-search');
    const categoryFilter = document.getElementById('category-filter');
    const expiryFilter = document.getElementById('expiry-filter');
    const sortOptions = document.querySelectorAll('.sort-option');
    
    // Variables
    let pantryItems = [];
    let currentSort = { field: 'name', direction: 'asc' };
    let editItemId = null;
    
    // Load pantry items
    loadPantryItems();
    
    // Event Listeners
    addPantryItemBtn.addEventListener('click', showAddItemModal);
    closeModalBtn.addEventListener('click', closeModal);
    closeModalX.addEventListener('click', closeModal);
    pantryItemForm.addEventListener('submit', handleFormSubmit);
    pantrySearch.addEventListener('input', filterItems);
    categoryFilter.addEventListener('change', filterItems);
    expiryFilter.addEventListener('change', filterItems);
    
    sortOptions.forEach(option => {
        option.addEventListener('click', function() {
            const field = this.getAttribute('data-sort');
            setSortField(field);
        });
    });
    
    // When user clicks outside the modal, close it
    window.addEventListener('click', function(event) {
        if (event.target === addPantryModal) {
            closeModal();
        }
    });
    
    // Functions
    function loadPantryItems() {
        // Show loading state
        pantryItemsContainer.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i> Loading items...
            </div>
        `;
        
        // Fetch items from API
        fetch('/api/pantry')
            .then(response => response.json())
            .then(items => {
                pantryItems = items;
                renderPantryItems();
            })
            .catch(error => {
                console.error('Error loading pantry items:', error);
                pantryItemsContainer.innerHTML = `
                    <div class="error">
                        <i class="fas fa-exclamation-circle"></i> Failed to load items. Please try again.
                    </div>
                `;
            });
    }
    
    function renderPantryItems() {
        // If no items, show empty state
        if (pantryItems.length === 0) {
            pantryItemsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <h3>Your pantry is empty</h3>
                    <p>Add items to your pantry to keep track of them.</p>
                    <button class="btn btn-primary" id="empty-add-btn">
                        <i class="fas fa-plus"></i> Add Item
                    </button>
                </div>
            `;
            document.getElementById('empty-add-btn').addEventListener('click', showAddItemModal);
            return;
        }
        
        // Filter and sort items
        const filteredItems = getFilteredItems();
        const sortedItems = getSortedItems(filteredItems);
        
        // Clear container
        pantryItemsContainer.innerHTML = '';
        
        // Render each item
        sortedItems.forEach(item => {
            const expiryDate = item.expiry_date ? new Date(item.expiry_date) : null;
            const today = new Date();
            const daysUntilExpiry = expiryDate ? Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24)) : null;
            
            let expiryClass = '';
            let expiryText = '';
            
            if (expiryDate) {
                if (daysUntilExpiry < 0) {
                    expiryClass = 'expiry-danger';
                    expiryText = `Expired ${Math.abs(daysUntilExpiry)} days ago`;
                } else if (daysUntilExpiry <= 7) {
                    expiryClass = 'expiry-warning';
                    expiryText = daysUntilExpiry === 0 ? 'Expires today' : 
                                 daysUntilExpiry === 1 ? 'Expires tomorrow' : 
                                 `Expires in ${daysUntilExpiry} days`;
                } else {
                    expiryClass = 'expiry-valid';
                    expiryText = `Expires in ${daysUntilExpiry} days`;
                }
            }
            
            const itemCard = document.createElement('div');
            itemCard.className = 'item-card';
            itemCard.innerHTML = `
                <div class="item-header">
                    <h3 class="item-name">${item.name}</h3>
                    <div class="item-actions">
                        <button class="item-action edit" data-id="${item.id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="item-action delete" data-id="${item.id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="item-details">
                    <div class="item-detail">
                        <i class="fas fa-cubes"></i>
                        <span>${item.quantity} ${item.unit || ''}</span>
                    </div>
                    <div class="item-detail">
                        <i class="fas fa-tag"></i>
                        <span class="item-category">${item.category || 'Other'}</span>
                    </div>
                    <div class="item-detail">
                        <i class="fas fa-calendar-plus"></i>
                        <span>Added: ${formatDate(item.added_date)}</span>
                    </div>
                </div>
                ${expiryDate ? `
                <div class="item-expiry ${expiryClass}">
                    <i class="fas fa-calendar-times"></i>
                    ${expiryText} (${formatDate(item.expiry_date)})
                </div>
                ` : ''}
            `;
            
            // Add item to container
            pantryItemsContainer.appendChild(itemCard);
            
            // Add event listeners to action buttons
            itemCard.querySelector('.edit').addEventListener('click', function() {
                const itemId = this.getAttribute('data-id');
                editItem(itemId);
            });
            
            itemCard.querySelector('.delete').addEventListener('click', function() {
                const itemId = this.getAttribute('data-id');
                deleteItem(itemId);
            });
        });
        
        // If no items match the filters
        if (sortedItems.length === 0) {
            pantryItemsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-filter"></i>
                    <h3>No items match your filters</h3>
                    <p>Try changing your search or filter settings.</p>
                    <button class="btn btn-secondary" id="clear-filters-btn">
                        <i class="fas fa-times"></i> Clear Filters
                    </button>
                </div>
            `;
            document.getElementById('clear-filters-btn').addEventListener('click', clearFilters);
        }
    }
    
    function getFilteredItems() {
        const searchTerm = pantrySearch.value.toLowerCase();
        const category = categoryFilter.value;
        const expiryStatus = expiryFilter.value;
        const today = new Date();
        
        return pantryItems.filter(item => {
            // Search filter
            const matchesSearch = !searchTerm || 
                                 item.name.toLowerCase().includes(searchTerm) || 
                                 item.category.toLowerCase().includes(searchTerm);
            
            // Category filter
            const matchesCategory = category === 'all' || item.category === category;
            
            // Expiry filter
            let matchesExpiry = true;
            if (expiryStatus !== 'all') {
                const expiryDate = item.expiry_date ? new Date(item.expiry_date) : null;
                const daysUntilExpiry = expiryDate ? Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24)) : null;
                
                if (expiryStatus === 'expiring' && (!expiryDate || daysUntilExpiry > 7 || daysUntilExpiry < 0)) {
                    matchesExpiry = false;
                } else if (expiryStatus === 'expired' && (!expiryDate || daysUntilExpiry >= 0)) {
                    matchesExpiry = false;
                } else if (expiryStatus === 'valid' && (!expiryDate || daysUntilExpiry < 0)) {
                    matchesExpiry = false;
                }
            }
            
            return matchesSearch && matchesCategory && matchesExpiry;
        });
    }
    
    function getSortedItems(items) {
        const { field, direction } = currentSort;
        
        return [...items].sort((a, b) => {
            let valueA, valueB;
            
            // Handle different field types
            if (field === 'name' || field === 'category') {
                valueA = a[field]?.toLowerCase() || '';
                valueB = b[field]?.toLowerCase() || '';
            } else if (field === 'expiry') {
                valueA = a.expiry_date ? new Date(a.expiry_date) : new Date(8640000000000000);
                valueB = b.expiry_date ? new Date(b.expiry_date) : new Date(8640000000000000);
            } else if (field === 'added') {
                valueA = new Date(a.added_date);
                valueB = new Date(b.added_date);
            } else {
                valueA = a[field];
                valueB = b[field];
            }
            
            // Compare values
            let comparison = 0;
            if (valueA < valueB) {
                comparison = -1;
            } else if (valueA > valueB) {
                comparison = 1;
            }
            
            // Apply sort direction
            return direction === 'asc' ? comparison : -comparison;
        });
    }
    
    function setSortField(field) {
        // If same field, toggle direction
        if (currentSort.field === field) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.field = field;
            currentSort.direction = 'asc';
        }
        
        // Re-render with new sort
        renderPantryItems();
    }
    
    function filterItems() {
        renderPantryItems();
    }
    
    function clearFilters() {
        pantrySearch.value = '';
        categoryFilter.value = 'all';
        expiryFilter.value = 'all';
        filterItems();
    }
    
    function showAddItemModal() {
        // Reset form
        pantryItemForm.reset();
        modalTitle.textContent = 'Add Pantry Item';
        editItemId = null;
        
        // Set default date to today
        document.getElementById('item-expiry').valueAsDate = new Date();
        
        // Show modal
        addPantryModal.style.display = 'block';
    }
    
    function editItem(itemId) {
        // Find item
        const item = pantryItems.find(item => item.id === itemId);
        if (!item) return;
        
        // Set form values
        document.getElementById('item-id').value = item.id;
        document.getElementById('item-name').value = item.name;
        document.getElementById('item-quantity').value = item.quantity;
        document.getElementById('item-unit').value = item.unit || '';
        document.getElementById('item-category').value = item.category;
        
        if (item.expiry_date) {
            document.getElementById('item-expiry').value = item.expiry_date;
        } else {
            document.getElementById('item-expiry').value = '';
        }
        
        // Update modal title and edit state
        modalTitle.textContent = 'Edit Pantry Item';
        editItemId = itemId;
        
        // Show modal
        addPantryModal.style.display = 'block';
    }
    
    function deleteItem(itemId) {
        if (confirm('Are you sure you want to delete this item?')) {
            fetch(`/api/pantry/${itemId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Remove from local array
                    pantryItems = pantryItems.filter(item => item.id !== itemId);
                    renderPantryItems();
                }
            })
            .catch(error => {
                console.error('Error deleting item:', error);
                alert('Failed to delete item. Please try again.');
            });
        }
    }
    
    function closeModal() {
        addPantryModal.style.display = 'none';
    }
    
    function handleFormSubmit(e) {
        e.preventDefault();
        
        // Get form values
        const itemName = document.getElementById('item-name').value;
        const itemQuantity = document.getElementById('item-quantity').value;
        const itemUnit = document.getElementById('item-unit').value;
        const itemCategory = document.getElementById('item-category').value;
        const itemExpiry = document.getElementById('item-expiry').value;
        
        // Prepare item data
        const itemData = {
            name: itemName,
            quantity: parseInt(itemQuantity, 10),
            unit: itemUnit,
            category: itemCategory,
            expiry_date: itemExpiry
        };
        
        // Determine if adding or editing
        if (editItemId) {
            // Update existing item
            fetch(`/api/pantry/${editItemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(itemData)
            })
            .then(response => response.json())
            .then(updatedItem => {
                // Update in local array
                const index = pantryItems.findIndex(item => item.id === editItemId);
                if (index !== -1) {
                    pantryItems[index] = updatedItem;
                }
                
                // Close modal and re-render
                closeModal();
                renderPantryItems();
            })
            .catch(error => {
                console.error('Error updating item:', error);
                alert('Failed to update item. Please try again.');
            });
        } else {
            // Add new item
            fetch('/api/pantry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(itemData)
            })
            .then(response => response.json())
            .then(newItem => {
                // Add to local array
                pantryItems.push(newItem);
                
                // Close modal and re-render
                closeModal();
                renderPantryItems();
            })
            .catch(error => {
                console.error('Error adding item:', error);
                alert('Failed to add item. Please try again.');
            });
        }
    }
    
    // Utility functions
    function formatDate(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
});