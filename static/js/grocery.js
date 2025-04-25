// static/js/grocery.js

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const groceryItemsContainer = document.getElementById('grocery-items-container');
    const addGroceryItemBtn = document.getElementById('add-grocery-item-btn');
    const addGroceryModal = document.getElementById('add-grocery-modal');
    const closeGroceryModalBtn = document.getElementById('close-grocery-modal-btn');
    const closeGroceryModalX = addGroceryModal.querySelector('.close');
    const groceryItemForm = document.getElementById('grocery-item-form');
    const groceryModalTitle = document.getElementById('grocery-modal-title');
    const grocerySearch = document.getElementById('grocery-search');
    const categoryFilter = document.getElementById('grocery-category-filter');
    const statusFilter = document.getElementById('status-filter');
    const completedCheckbox = document.getElementById('grocery-item-completed');
    const addToPantryCheckbox = document.getElementById('add-to-pantry');
    const expiryDateContainer = document.getElementById('expiry-date-container');
    
    // Variables
    let groceryItems = [];
    let editItemId = null;
    
    // Load grocery items
    loadGroceryItems();
    
    // Event Listeners
    addGroceryItemBtn.addEventListener('click', showAddItemModal);
    closeGroceryModalBtn.addEventListener('click', closeModal);
    closeGroceryModalX.addEventListener('click', closeModal);
    groceryItemForm.addEventListener('submit', handleFormSubmit);
    grocerySearch.addEventListener('input', filterItems);
    categoryFilter.addEventListener('change', filterItems);
    statusFilter.addEventListener('change', filterItems);
    
    // When user clicks outside the modal, close it
    window.addEventListener('click', function(event) {
        if (event.target === addGroceryModal) {
            closeModal();
        }
    });
    
    // Toggle add to pantry and expiry date based on completed status
    completedCheckbox.addEventListener('change', function() {
        const completedContainer = document.getElementById('add-to-pantry-container');
        completedContainer.style.display = this.checked ? 'block' : 'none';
        
        // If unchecked, also uncheck add to pantry
        if (!this.checked) {
            addToPantryCheckbox.checked = false;
            expiryDateContainer.style.display = 'none';
        }
    });
    
    // Toggle expiry date based on add to pantry
    addToPantryCheckbox.addEventListener('change', function() {
        expiryDateContainer.style.display = this.checked ? 'block' : 'none';
    });
    
    // Functions
    function loadGroceryItems() {
        // Show loading state
        groceryItemsContainer.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i> Loading items...
            </div>
        `;
        
        // Fetch items from API
        fetch('/api/grocery')
            .then(response => response.json())
            .then(items => {
                groceryItems = items;
                renderGroceryItems();
            })
            .catch(error => {
                console.error('Error loading grocery items:', error);
                groceryItemsContainer.innerHTML = `
                    <div class="error">
                        <i class="fas fa-exclamation-circle"></i> Failed to load items. Please try again.
                    </div>
                `;
            });
    }
    
    function renderGroceryItems() {
        // If no items, show empty state
        if (groceryItems.length === 0) {
            groceryItemsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-shopping-cart"></i>
                    <h3>Your grocery list is empty</h3>
                    <p>Add items to your grocery list to keep track of them.</p>
                    <button class="btn btn-primary" id="empty-add-btn">
                        <i class="fas fa-plus"></i> Add Item
                    </button>
                </div>
            `;
            document.getElementById('empty-add-btn').addEventListener('click', showAddItemModal);
            return;
        }
        
        // Filter items
        const filteredItems = getFilteredItems();
        
        // Clear container
        groceryItemsContainer.innerHTML = '';
        
        // Group by category
        const groupedItems = groupItemsByCategory(filteredItems);
        
        // Render each category
        Object.entries(groupedItems).forEach(([category, items]) => {
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'category-header';
            categoryHeader.innerHTML = `<h3>${category}</h3>`;
            groceryItemsContainer.appendChild(categoryHeader);
            
            // Render each item
            items.forEach(item => {
                const groceryItem = document.createElement('div');
                groceryItem.className = `grocery-item ${item.completed ? 'completed' : ''}`;
                groceryItem.innerHTML = `
                    <div class="grocery-checkbox">
                        <input type="checkbox" id="check-${item.id}" ${item.completed ? 'checked' : ''}>
                    </div>
                    <div class="grocery-content">
                        <div class="grocery-name">${item.name}</div>
                        <div class="grocery-details">
                            <span>${item.quantity} ${item.unit || ''}</span>
                            <span>Added: ${formatDate(item.added_date)}</span>
                        </div>
                    </div>
                    <div class="grocery-actions">
                        <button class="item-action edit" data-id="${item.id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="item-action delete" data-id="${item.id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                
                groceryItemsContainer.appendChild(groceryItem);
                
                // Add event listeners
                groceryItem.querySelector(`#check-${item.id}`).addEventListener('change', function() {
                    toggleItemCompleted(item.id, this.checked);
                });
                
                groceryItem.querySelector('.edit').addEventListener('click', function() {
                    const itemId = this.getAttribute('data-id');
                    editItem(itemId);
                });
                
                groceryItem.querySelector('.delete').addEventListener('click', function() {
                    const itemId = this.getAttribute('data-id');
                    deleteItem(itemId);
                });
            });
        });
        
        // If no items match the filters
        if (filteredItems.length === 0 && groceryItems.length > 0) {
            groceryItemsContainer.innerHTML = `
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
        const searchTerm = grocerySearch.value.toLowerCase();
        const category = categoryFilter.value;
        const status = statusFilter.value;
        
        return groceryItems.filter(item => {
            // Search filter
            const matchesSearch = !searchTerm || 
                                 item.name.toLowerCase().includes(searchTerm) || 
                                 (item.category && item.category.toLowerCase().includes(searchTerm));
            
            // Category filter
            const matchesCategory = category === 'all' || item.category === category;
            
            // Status filter
            const matchesStatus = status === 'all' || 
                                (status === 'active' && !item.completed) || 
                                (status === 'completed' && item.completed);
            
            return matchesSearch && matchesCategory && matchesStatus;
        });
    }
    
    function groupItemsByCategory(items) {
        const grouped = {};
        
        items.forEach(item => {
            const category = item.category || 'Other';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(item);
        });
        
        // Sort categories alphabetically
        return Object.fromEntries(
            Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]))
        );
    }
    
    function filterItems() {
        renderGroceryItems();
    }
    
    function clearFilters() {
        grocerySearch.value = '';
        categoryFilter.value = 'all';
        statusFilter.value = 'all';
        filterItems();
    }
    
    function showAddItemModal() {
        // Reset form
        groceryItemForm.reset();
        groceryModalTitle.textContent = 'Add Grocery Item';
        editItemId = null;
        
        // Hide completed and add to pantry containers for new items
        document.getElementById('completed-container').style.display = 'none';
        document.getElementById('add-to-pantry-container').style.display = 'none';
        expiryDateContainer.style.display = 'none';
        
        // Show modal
        addGroceryModal.style.display = 'block';
    }
    
    function editItem(itemId) {
        // Find item
        const item = groceryItems.find(item => item.id === itemId);
        if (!item) return;
        
        // Set form values
        document.getElementById('grocery-item-id').value = item.id;
        document.getElementById('grocery-item-name').value = item.name;
        document.getElementById('grocery-item-quantity').value = item.quantity;
        document.getElementById('grocery-item-unit').value = item.unit || '';
        document.getElementById('grocery-item-category').value = item.category;
        
        // Show completed checkbox for editing
        document.getElementById('completed-container').style.display = 'block';
        document.getElementById('grocery-item-completed').checked = item.completed;
        
        // Show/hide add to pantry based on completed status
        document.getElementById('add-to-pantry-container').style.display = item.completed ? 'block' : 'none';
        document.getElementById('add-to-pantry').checked = false;
        expiryDateContainer.style.display = 'none';
        
        // Update modal title and edit state
        groceryModalTitle.textContent = 'Edit Grocery Item';
        editItemId = itemId;
        
        // Show modal
        addGroceryModal.style.display = 'block';
    }
    
    function toggleItemCompleted(itemId, completed) {
        // Find item
        const item = groceryItems.find(item => item.id === itemId);
        if (!item) return;
        
        // Update item
        const updateData = {
            ...item,
            completed: completed
        };
        
        fetch(`/api/grocery/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        })
        .then(response => response.json())
        .then(updatedItem => {
            // Update in local array
            const index = groceryItems.findIndex(item => item.id === itemId);
            if (index !== -1) {
                groceryItems[index] = updatedItem;
            }
            
            // Re-render
            renderGroceryItems();
        })
        .catch(error => {
            console.error('Error updating item:', error);
            alert('Failed to update item. Please try again.');
        });
    }
    
    function deleteItem(itemId) {
        if (confirm('Are you sure you want to delete this item?')) {
            fetch(`/api/grocery/${itemId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Remove from local array
                    groceryItems = groceryItems.filter(item => item.id !== itemId);
                    renderGroceryItems();
                }
            })
            .catch(error => {
                console.error('Error deleting item:', error);
                alert('Failed to delete item. Please try again.');
            });
        }
    }
    
    function closeModal() {
        addGroceryModal.style.display = 'none';
    }
    
    function handleFormSubmit(e) {
        e.preventDefault();
        
        // Get form values
        const itemName = document.getElementById('grocery-item-name').value;
        const itemQuantity = document.getElementById('grocery-item-quantity').value;
        const itemUnit = document.getElementById('grocery-item-unit').value;
        const itemCategory = document.getElementById('grocery-item-category').value;
        const itemCompleted = document.getElementById('grocery-item-completed')?.checked || false;
        const addToPantry = document.getElementById('add-to-pantry')?.checked || false;
        const itemExpiry = document.getElementById('grocery-item-expiry')?.value || '';
        
        // Validate required fields
        if (!itemName.trim()) {
            alert('Please enter an item name');
            return;
        }
        
        // Validate quantity
        if (itemQuantity < 1) {
            alert('Quantity must be at least 1');
            return;
        }
        
        // Validate expiry date if adding to pantry
        if (itemCompleted && addToPantry && !itemExpiry) {
            alert('Please enter an expiration date when adding to pantry');
            return;
        }
        
        // Prepare item data
        const itemData = {
            name: itemName,
            quantity: parseInt(itemQuantity, 10),
            unit: itemUnit,
            category: itemCategory,
            completed: itemCompleted
        };
        
        // Add expiry date and add_to_pantry if needed
        if (itemCompleted && addToPantry) {
            itemData.add_to_pantry = true;
            itemData.expiry_date = itemExpiry;
        }
        
        // Determine if adding or editing
        if (editItemId) {
            // Update existing item
            fetch(`/api/grocery/${editItemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(itemData)
            })
            .then(response => response.json())
            .then(updatedItem => {
                // Update in local array
                const index = groceryItems.findIndex(item => item.id === editItemId);
                if (index !== -1) {
                    groceryItems[index] = updatedItem;
                }
                
                // Close modal and re-render
                closeModal();
                renderGroceryItems();
                
                // Show success message
                showMessage('Item updated successfully!', 'success');
                
                // If item was marked as completed and added to pantry
                if (itemCompleted && addToPantry) {
                    showMessage('Item added to your pantry!', 'success');
                }
            })
            .catch(error => {
                console.error('Error updating item:', error);
                showMessage('Failed to update item. Please try again.', 'error');
            });
        } else {
            // Add new item
            fetch('/api/grocery', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(itemData)
            })
            .then(response => response.json())
            .then(newItem => {
                // Add to local array
                groceryItems.push(newItem);
                
                // Close modal and re-render
                closeModal();
                renderGroceryItems();
                
                // Show success message
                showMessage('Item added to your grocery list!', 'success');
            })
            .catch(error => {
                console.error('Error adding item:', error);
                showMessage('Failed to add item. Please try again.', 'error');
            });
        }
    }
    
    // Show a temporary message to the user
    function showMessage(message, type = 'info') {
        // Remove any existing messages
        const existingMessage = document.querySelector('.message-alert');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = `message-alert ${type}`;
        messageElement.textContent = message;
        
        // Add to page
        document.querySelector('.page-header').after(messageElement);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            messageElement.classList.add('fadeout');
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.parentNode.removeChild(messageElement);
                }
            }, 500);
        }, 3000);
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