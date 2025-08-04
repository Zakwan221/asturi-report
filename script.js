// ASTURI Report Accounting System with Image Upload Support

// Global variables
let topics = [];
let currentTopicId = null;
let currentSubtopicId = null;
let currentPDF = null;
let pdfDoc = null;
let pageNum = 1;
let pageCount = 0;
let scale = 1.2;
let canvas = null;
let ctx = null;
let renameTargetId = null;
let renameTargetType = null; // 'topic' or 'subtopic'

// Storage key
const STORAGE_KEY = 'asturi_report_topics';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    // Load data and render
    loadData();
    renderTopics();
    
    // Initialize canvas
    canvas = document.getElementById('pdf-canvas');
    ctx = canvas.getContext('2d');
    
    // Setup radio button change handlers
    setupModalHandlers();
    
    // Add right-click context menu
    setupContextMenu();
});

// Save data to localStorage
function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(topics));
        console.log('Topics saved to localStorage');
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

// Load data from localStorage
function loadData() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            topics = JSON.parse(savedData);
            console.log('Topics loaded from localStorage');
        } else {
            loadDefaultData();
            saveData();
        }
    } catch (error) {
        console.error('Error loading data:', error);
        loadDefaultData();
        saveData();
    }
}

// Save image to localStorage
function saveImageToStorage(subtopicId, imageDataUrl) {
    try {
        localStorage.setItem(`image_${subtopicId}`, imageDataUrl);
        console.log(`Image saved for subtopic ${subtopicId}`);
    } catch (error) {
        console.error('Error saving image:', error);
        alert('Error saving image. File may be too large.');
    }
}

// Get image from localStorage
function getImageFromStorage(subtopicId) {
    try {
        return localStorage.getItem(`image_${subtopicId}`);
    } catch (error) {
        console.error('Error loading image:', error);
        return null;
    }
}

// Remove image from localStorage
function removeImageFromStorage(subtopicId) {
    try {
        localStorage.removeItem(`image_${subtopicId}`);
        console.log(`Image removed for subtopic ${subtopicId}`);
    } catch (error) {
        console.error('Error removing image:', error);
    }
}

// Save PDF to localStorage
function savePDFToStorage(subtopicId, pdfData) {
    try {
        localStorage.setItem(`pdf_${subtopicId}`, pdfData);
        console.log(`PDF saved for subtopic ${subtopicId}`);
    } catch (error) {
        console.error('Error saving PDF:', error);
        alert('Error saving PDF. File may be too large.');
    }
}

// Get PDF from localStorage
function getPDFFromStorage(subtopicId) {
    try {
        return localStorage.getItem(`pdf_${subtopicId}`);
    } catch (error) {
        console.error('Error loading PDF:', error);
        return null;
    }
}

// Setup context menu for rename functionality
function setupContextMenu() {
    document.addEventListener('contextmenu', function(e) {
        // Check if right-clicked on a topic or subtopic
        const topicHeader = e.target.closest('.topic-header');
        const subtopic = e.target.closest('.subtopic');
        
        if (topicHeader || subtopic) {
            e.preventDefault();
            showContextMenu(e, topicHeader, subtopic);
        }
    });
    
    // Hide context menu when clicking elsewhere
    document.addEventListener('click', function() {
        hideContextMenu();
    });
}

function showContextMenu(e, topicHeader, subtopic) {
    hideContextMenu(); // Hide any existing context menu
    
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.innerHTML = `
        <div class="context-menu-item" onclick="initiateRename(event)">
            <i class="fas fa-edit"></i> Rename
        </div>
    `;
    
    // Store the target for renaming
    if (topicHeader) {
        const topicDiv = topicHeader.closest('.topic');
        renameTargetId = getTopicIdFromElement(topicHeader);
        renameTargetType = 'topic';
    } else if (subtopic) {
        renameTargetId = getSubtopicIdFromElement(subtopic);
        renameTargetType = 'subtopic';
    }
    
    // Position the context menu
    contextMenu.style.left = e.pageX + 'px';
    contextMenu.style.top = e.pageY + 'px';
    
    document.body.appendChild(contextMenu);
}

function hideContextMenu() {
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
}

function getTopicIdFromElement(element) {
    // Extract ID from onclick attribute or data attribute
    const controls = element.querySelector('.topic-controls');
    if (controls) {
        const deleteBtn = controls.querySelector('.control-btn[title="Delete"]');
        if (deleteBtn) {
            const onclick = deleteBtn.getAttribute('onclick');
            const match = onclick.match(/deleteTopic\((\d+)\)/);
            if (match) return parseInt(match[1]);
        }
    }
    return null;
}

function getSubtopicIdFromElement(element) {
    // Extract ID from onclick attribute
    const controls = element.querySelector('.subtopic-controls');
    if (controls) {
        const deleteBtn = controls.querySelector('.control-btn[title="Delete"]');
        if (deleteBtn) {
            const onclick = deleteBtn.getAttribute('onclick');
            const match = onclick.match(/deleteSubtopic\((\d+),/);
            if (match) return parseInt(match[1]);
        }
    }
    return null;
}

function initiateRename(e) {
    e.stopPropagation();
    hideContextMenu();
    
    if (renameTargetId && renameTargetType) {
        const target = findTopicById(renameTargetId);
        if (target) {
            document.getElementById('rename-input').value = target.name;
            document.getElementById('rename-modal').style.display = 'block';
            document.getElementById('rename-input').focus();
            document.getElementById('rename-input').select();
        }
    }
}

function closeRenameModal() {
    document.getElementById('rename-modal').style.display = 'none';
    renameTargetId = null;
    renameTargetType = null;
}

function confirmRename() {
    const newName = document.getElementById('rename-input').value.trim();
    if (newName && renameTargetId && renameTargetType) {
        const target = findTopicById(renameTargetId);
        if (target) {
            target.name = newName;
            target.lastModified = new Date().toISOString();
            saveData();
            renderTopics();
            
            // Update main content if currently selected
            if (currentSubtopicId === renameTargetId) {
                document.getElementById('content-title').textContent = newName;
                document.getElementById('report-title').textContent = newName;
            }
        }
    }
    closeRenameModal();
}

// Setup modal radio button handlers
function setupModalHandlers() {
    // Topic modal radio buttons
    const topicRadios = document.querySelectorAll('input[name="topic-type"]');
    topicRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            updateRadioSelection('topic-type');
        });
    });
    
    // Subtopic modal radio buttons
    const subtopicRadios = document.querySelectorAll('input[name="subtopic-type"]');
    subtopicRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            updateRadioSelection('subtopic-type');
        });
    });
}

// Update radio button visual selection
function updateRadioSelection(radioName) {
    const radios = document.querySelectorAll(`input[name="${radioName}"]`);
    radios.forEach(radio => {
        const option = radio.closest('.radio-option');
        if (radio.checked) {
            option.classList.add('checked');
        } else {
            option.classList.remove('checked');
        }
    });
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Load default data (specific to ASTURI business requirements)
function loadDefaultData() {
    const now = new Date().toISOString();
    
    topics = [
        {
            id: 1,
            name: "STANDARD FORMAT FOR FINANCE",
            icon: "fas fa-folder",
            expanded: true,
            folderType: "folder",
            createdDate: now,
            subtopics: [
                {
                    id: 11,
                    name: "PROFIT & LOSS STATEMENT",
                    description: "Comprehensive profit and loss financial statement",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 12,
                    name: "BALANCE SHEET",
                    description: "Complete balance sheet report",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                }
            ]
        },
        {
            id: 2,
            name: "REPORT FOR REVENUE",
            icon: "fas fa-folder",
            expanded: false,
            folderType: "folder",
            createdDate: now,
            subtopics: [
                {
                    id: 21,
                    name: "Summary of Property Rental",
                    description: "Comprehensive property rental revenue summary",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                }
            ]
        },
        {
            id: 3,
            name: "REPORT FOR INVOICE & PAYMENT RECEIVED",
            icon: "fas fa-folder",
            expanded: false,
            folderType: "folder",
            createdDate: now,
            subtopics: [
                {
                    id: 31,
                    name: "Rental Lot 74-A, Gebeng",
                    description: "Invoice and payment tracking for Lot 74-A, Gebeng",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 32,
                    name: "Rental Lot 3/129, Gebeng",
                    description: "Invoice and payment tracking for Lot 3/129, Gebeng",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 33,
                    name: "Rental Land, Gebeng",
                    description: "Invoice and payment tracking for Land, Gebeng",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 34,
                    name: "Rental Bangi",
                    description: "Invoice and payment tracking for Bangi property",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 35,
                    name: "Rental Jalan Kuching - Blok 3",
                    description: "Invoice and payment tracking for Jalan Kuching Blok 3",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 36,
                    name: "Rental Jalan Kuching - Blok 3A",
                    description: "Invoice and payment tracking for Jalan Kuching Blok 3A",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 37,
                    name: "Rental Short Term Rental",
                    description: "Invoice and payment tracking for short term rentals",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 38,
                    name: "Rental of Equipment",
                    description: "Invoice and payment tracking for equipment rental",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                },
                {
                    id: 39,
                    name: "Rental Others",
                    description: "Invoice and payment tracking for other rental services",
                    folderType: "pdf-folder",
                    expanded: false,
                    createdDate: now
                }
            ]
        }
        // Additional default data continues...
    ];
}

// Generate unique ID
function generateId() {
    return Date.now() + Math.random();
}

// Render all topics
function renderTopics() {
    const container = document.getElementById('topics-container');
    container.innerHTML = '';
    
    if (topics.length === 0) {
        container.innerHTML = `
            <div class="empty-topics">
                <i class="fas fa-folder-open"></i>
                <p>No topics yet. Click "Add Topic" to create your first folder or report.</p>
            </div>
        `;
        return;
    }
    
    topics.forEach(topic => {
        const topicElement = createTopicElement(topic, 0);
        container.appendChild(topicElement);
    });
}

// Create topic element with enhanced folder type support and date tracking
function createTopicElement(topic, level = 0) {
    const topicDiv = document.createElement('div');
    topicDiv.className = `topic ${level > 0 ? `nested-topic level-${level}` : ''}`;
    
    const hasSubtopics = topic.subtopics && topic.subtopics.length > 0;
    const canExpand = hasSubtopics;
    const folderType = topic.folderType || 'folder';
    const isClickable = folderType === 'pdf-folder';
    
    // Determine emoji based on folder type
    let emoji = '📁';
    if (folderType === 'pdf-folder') {
        emoji = '📄';
    }
    
    // Format dates
    const createdDate = topic.createdDate ? formatDate(topic.createdDate) : '';
    const uploadDate = topic.uploadDate ? formatDate(topic.uploadDate) : '';
    
    topicDiv.innerHTML = `
        <div class="topic-header ${folderType === 'folder' ? 'folder' : ''}" 
             onclick="${isClickable ? `selectSubtopic(${topic.id}, ${topic.id})` : `toggleTopic(${topic.id})`}">
            <div class="topic-title">
                ${canExpand ? `<span class="expand-icon ${topic.expanded ? 'expanded' : ''}" onclick="event.stopPropagation(); toggleTopic(${topic.id})">▼</span>` : '<span style="width: 16px;"></span>'}
                <span class="folder-emoji">${emoji}</span>
                <div class="topic-info">
                    <span class="topic-name">${topic.name}</span>
                    <div class="topic-dates">
                        ${createdDate ? `<div class="created-info"><i class="fas fa-plus"></i> ${createdDate}</div>` : ''}
                        ${uploadDate ? `<div class="upload-info"><i class="fas fa-upload"></i> ${uploadDate}</div>` : ''}
                    </div>
                </div>
            </div>
            <div class="topic-controls">
                <button class="control-btn" onclick="event.stopPropagation(); addSubtopic(${topic.id})" title="Add Item">+</button>
                <button class="control-btn" onclick="event.stopPropagation(); deleteTopic(${topic.id})" title="Delete">×</button>
            </div>
        </div>
        <div class="subtopics ${topic.expanded ? 'expanded' : ''}" id="subtopics-${topic.id}">
            ${hasSubtopics ? topic.subtopics.map(subtopic => createSubtopicElement(subtopic, topic.id, level + 1)).join('') : ''}
        </div>
    `;
    
    return topicDiv;
}

// Create subtopic element with enhanced nesting, folder type support and date tracking
function createSubtopicElement(subtopic, parentId, level = 1) {
    const hasSubtopics = subtopic.subtopics && subtopic.subtopics.length > 0;
    const canExpand = hasSubtopics;
    const indentLevel = Math.min(level * 20, 100); // Cap at 100px for deep nesting
    const folderType = subtopic.folderType || 'pdf-folder';
    const isClickable = folderType === 'pdf-folder';
    
    // Determine emoji based on folder type
    let emoji = '📄';
    if (folderType === 'folder') {
        emoji = '📁';
    }
    
    // Format dates
    const createdDate = subtopic.createdDate ? formatDate(subtopic.createdDate) : '';
    const uploadDate = subtopic.uploadDate ? formatDate(subtopic.uploadDate) : '';
    
    return `
        <div class="subtopic-container" style="margin-left: ${indentLevel}px;">
            <div class="subtopic ${currentSubtopicId === subtopic.id ? 'active' : ''}" 
                 onclick="${isClickable ? `selectSubtopic(${subtopic.id}, ${parentId})` : ''}">
                <div class="subtopic-info">
                    <div class="subtopic-header">
                        ${canExpand ? `<span class="expand-icon ${subtopic.expanded ? 'expanded' : ''}" onclick="event.stopPropagation(); toggleSubtopic(${subtopic.id})">▼</span>` : '<span style="width: 14px;"></span>'}
                        <span class="subtopic-icon">${emoji}</span>
                        <span class="subtopic-title">${subtopic.name}</span>
                    </div>
                    ${subtopic.description ? `<div class="subtopic-desc">${subtopic.description}</div>` : ''}
                    <div class="subtopic-dates">
                        ${createdDate ? `<div class="created-info"><i class="fas fa-plus"></i> ${createdDate}</div>` : ''}
                        ${uploadDate ? `<div class="upload-info"><i class="fas fa-upload"></i> ${uploadDate}</div>` : ''}
                    </div>
                </div>
                <div class="subtopic-controls">
                    ${folderType === 'folder' ? `<button class="control-btn" onclick="event.stopPropagation(); addSubtopic(${subtopic.id})" title="Add Sub-item">+</button>` : ''}
                    <button class="control-btn" onclick="event.stopPropagation(); deleteSubtopic(${subtopic.id}, ${parentId})" title="Delete">×</button>
                </div>
            </div>
            ${hasSubtopics ? `
                <div class="nested-subtopics ${subtopic.expanded ? 'expanded' : ''}" id="subtopics-${subtopic.id}">
                    ${subtopic.subtopics.map(nestedSub => createSubtopicElement(nestedSub, subtopic.id, level + 1)).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

// Toggle topic expansion
function toggleTopic(topicId) {
    const topic = findTopicById(topicId);
    if (topic && (topic.subtopics && topic.subtopics.length > 0)) {
        topic.expanded = !topic.expanded;
        saveData();
        renderTopics();
    }
}

// Toggle subtopic expansion
function toggleSubtopic(subtopicId) {
    const subtopic = findTopicById(subtopicId);
    if (subtopic && subtopic.subtopics && subtopic.subtopics.length > 0) {
        subtopic.expanded = !subtopic.expanded;
        saveData();
        renderTopics();
    }
}

// Find topic by ID (recursive search)
function findTopicById(id, topicsList = topics) {
    for (let topic of topicsList) {
        if (topic.id === id) {
            return topic;
        }
        if (topic.subtopics) {
            const found = findTopicById(id, topic.subtopics);
            if (found) return found;
        }
    }
    return null;
}

// Find parent topic of a subtopic
function findParentTopic(subtopicId, topicsList = topics) {
    for (let topic of topicsList) {
        if (topic.subtopics) {
            for (let subtopic of topic.subtopics) {
                if (subtopic.id === subtopicId) {
                    return topic;
                }
                if (subtopic.subtopics) {
                    const found = findParentTopic(subtopicId, topic.subtopics);
                    if (found) return found;
                }
            }
        }
    }
    return null;
}

// Select subtopic (only for PDF folders)
function selectSubtopic(subtopicId, topicId) {
    const subtopic = findTopicById(subtopicId);
    if (!subtopic || subtopic.folderType !== 'pdf-folder') {
        console.log('Only PDF folders can be selected for viewing');
        return;
    }
    
    currentSubtopicId = subtopicId;
    currentTopicId = topicId;
    
    // Update header
    document.getElementById('content-title').textContent = subtopic.name;
    document.getElementById('content-subtitle').textContent = subtopic.description || 'PDF document folder';
    
    // Show report view
    document.getElementById('content-body').style.display = 'none';
    const reportView = document.getElementById('report-view');
    reportView.style.display = 'block';
    
    // Update report view content
    document.getElementById('report-title').textContent = subtopic.name;
    document.getElementById('report-description').textContent = subtopic.description || 'PDF document folder';
    
    // Update dates in report meta
    const reportMeta = document.getElementById('report-meta');
    const createdDateEl = document.getElementById('created-date');
    const uploadDateEl = document.getElementById('upload-date');
    
    if (subtopic.createdDate) {
        createdDateEl.innerHTML = `<i class="fas fa-plus"></i> Created: ${formatDate(subtopic.createdDate)}`;
        createdDateEl.style.display = 'flex';
    } else {
        createdDateEl.style.display = 'none';
    }
    
    if (subtopic.uploadDate) {
        uploadDateEl.innerHTML = `<i class="fas fa-upload"></i> Upload: ${formatDate(subtopic.uploadDate)}`;
        uploadDateEl.style.display = 'flex';
    } else {
        uploadDateEl.style.display = 'none';
    }
    
    // Check for saved image
    const savedImage = getImageFromStorage(subtopicId);
    if (savedImage) {
        showUploadedImage(savedImage);
    } else {
        document.getElementById('image-viewer').style.display = 'none';
    }
    
    // Check for saved PDF
    const savedPDF = getPDFFromStorage(subtopicId);
    if (savedPDF) {
        loadSavedPDF(savedPDF);
        // Hide the report icon when PDF is loaded
        document.getElementById('report-icon').classList.add('pdf-uploaded');
    } else {
        // Reset PDF viewer
        document.getElementById('pdf-viewer').style.display = 'none';
        document.getElementById('excel-btn').style.display = 'none';
    }
    
    // Show/hide upload section based on content
    if (savedImage || savedPDF) {
        document.getElementById('upload-section').style.display = 'none';
        document.getElementById('report-icon').classList.add('pdf-uploaded');
    } else {
        document.getElementById('upload-section').style.display = 'block';
        document.getElementById('report-icon').classList.remove('pdf-uploaded');
    }
    
    // Re-render to update active state
    renderTopics();
}

// Add topic
function addTopic() {
    document.getElementById('topic-modal').style.display = 'block';
    document.getElementById('topic-name').value = '';
    
    // Reset radio buttons to default (folder)
    document.getElementById('type-folder').checked = true;
    document.getElementById('type-pdf-folder').checked = false;
    updateRadioSelection('topic-type');
    
    document.getElementById('topic-name').focus();
}

// Create topic with enhanced folder type support and date tracking
function createTopic() {
    const name = document.getElementById('topic-name').value.trim();
    const folderType = document.querySelector('input[name="topic-type"]:checked').value;
    
    if (name) {
        const newId = generateId();
        const now = new Date().toISOString();
        const newTopic = {
            id: newId,
            name: name.toUpperCase(),
            icon: folderType === 'folder' ? "fas fa-folder" : "fas fa-file-pdf",
            expanded: false,
            folderType: folderType,
            createdDate: now
        };
        
        // Only add subtopics array for folders
        if (folderType === 'folder') {
            newTopic.subtopics = [];
        }
        
        topics.push(newTopic);
        saveData();
        renderTopics();
        closeModal();
    }
}

// Add subtopic
function addSubtopic(topicId) {
    const parentTopic = findTopicById(topicId);
    if (!parentTopic) return;
    
    // Check if parent can contain subtopics
    if (parentTopic.folderType === 'pdf-folder') {
        alert('PDF folders cannot contain sub-items. Only regular folders can contain other items.');
        return;
    }
    
    currentTopicId = topicId;
    document.getElementById('subtopic-modal').style.display = 'block';
    document.getElementById('subtopic-name').value = '';
    document.getElementById('subtopic-description').value = '';
    
    // Reset radio buttons to default (folder)
    document.getElementById('subtype-folder').checked = true;
    document.getElementById('subtype-pdf-folder').checked = false;
    updateRadioSelection('subtopic-type');
    
    document.getElementById('subtopic-name').focus();
}

// Create subtopic with enhanced folder type support and date tracking
function createSubtopic() {
    const name = document.getElementById('subtopic-name').value.trim();
    const description = document.getElementById('subtopic-description').value.trim() || 'No description provided';
    const folderType = document.querySelector('input[name="subtopic-type"]:checked').value;
    
    if (name && currentTopicId) {
        const parentTopic = findTopicById(currentTopicId);
        if (parentTopic) {
            // Initialize subtopics array if it doesn't exist
            if (!parentTopic.subtopics) {
                parentTopic.subtopics = [];
            }
            
            const newId = generateId();
            const now = new Date().toISOString();
            const newSubtopic = {
                id: newId,
                name: name,
                description: description,
                folderType: folderType,
                expanded: false,
                createdDate: now
            };
            
            // Only add subtopics array for folders
            if (folderType === 'folder') {
                newSubtopic.subtopics = [];
            }
            
            parentTopic.subtopics.push(newSubtopic);
            saveData();
            renderTopics();
            closeSubtopicModal();
        }
    }
}

// Delete topic with enhanced error handling
function deleteTopic(topicId) {
    const topic = findTopicById(topicId);
    if (!topic) return;
    
    const itemCount = countAllItems(topic);
    const confirmMessage = itemCount > 1 ? 
        `Are you sure you want to delete this item and all ${itemCount - 1} sub-items?` :
        'Are you sure you want to delete this item?';
    
    if (confirm(confirmMessage)) {
        // Remove from topics array (recursive)
        function removeFromArray(arr) {
            for (let i = 0; i < arr.length; i++) {
                if (arr[i].id === topicId) {
                    arr.splice(i, 1);
                    return true;
                }
                if (arr[i].subtopics && removeFromArray(arr[i].subtopics)) {
                    return true;
                }
            }
            return false;
        }
        
        removeFromArray(topics);
        
        // Clean up storage
        removeImageFromStorage(topicId);
        localStorage.removeItem(`pdf_${topicId}`);
        
        if (currentTopicId === topicId || currentSubtopicId === topicId) {
            resetMainContent();
        }
        saveData();
        renderTopics();
    }
}

// Delete subtopic with enhanced error handling
function deleteSubtopic(subtopicId, parentId) {
    const subtopic = findTopicById(subtopicId);
    if (!subtopic) return;
    
    const itemCount = countAllItems(subtopic);
    const confirmMessage = itemCount > 1 ? 
        `Are you sure you want to delete this item and all ${itemCount - 1} sub-items?` :
        'Are you sure you want to delete this item?';
    
    if (confirm(confirmMessage)) {
        // Find and remove the subtopic recursively
        function removeSubtopicRecursive(items) {
            if (!items) return false;
            
            for (let i = 0; i < items.length; i++) {
                if (items[i].id === subtopicId) {
                    items.splice(i, 1);
                    return true;
                }
                if (items[i].subtopics && removeSubtopicRecursive(items[i].subtopics)) {
                    return true;
                }
            }
            return false;
        }
        
        // Start from the parent topic
        const parentTopic = findTopicById(parentId);
        if (parentTopic && parentTopic.subtopics) {
            removeSubtopicRecursive(parentTopic.subtopics);
        } else {
            // If not found in parent, search all topics
            for (let topic of topics) {
                if (removeSubtopicRecursive(topic.subtopics)) {
                    break;
                }
            }
        }
        
        // Clean up storage
        removeImageFromStorage(subtopicId);
        localStorage.removeItem(`pdf_${subtopicId}`);
        
        if (currentSubtopicId === subtopicId) {
            resetMainContent();
        }
        saveData();
        renderTopics();
    }
}

// Helper function to count all items in a tree
function countAllItems(item) {
    let count = 1; // Count the item itself
    if (item.subtopics) {
        for (let subtopic of item.subtopics) {
            count += countAllItems(subtopic);
        }
    }
    return count;
}

// Reset main content
function resetMainContent() {
    currentTopicId = null;
    currentSubtopicId = null;
    currentPDF = null;
    document.getElementById('content-title').textContent = 'Select a Report';
    document.getElementById('content-subtitle').textContent = 'Choose a PDF folder from the sidebar to get started';
    document.getElementById('content-body').style.display = 'block';
    document.getElementById('report-view').style.display = 'none';
    document.getElementById('pdf-viewer').style.display = 'none';
    document.getElementById('image-viewer').style.display = 'none';
    document.getElementById('upload-section').style.display = 'block';
    document.getElementById('report-icon').classList.remove('pdf-uploaded');
}

// Image Upload Functions
function uploadImage() {
    if (!currentSubtopicId) {
        alert('Please select a PDF folder first.');
        return;
    }
    document.getElementById('image-input').click();
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        handleImageFile(file);
    } else {
        alert('Please select a valid image file.');
    }
    
    // Reset the input
    event.target.value = '';
}

function handleImageFile(file) {
    if (!currentSubtopicId) {
        alert('Please select a PDF folder first.');
        return;
    }
    
    showLoading();
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const imageDataUrl = e.target.result;
        
        // Save image to localStorage
        saveImageToStorage(currentSubtopicId, imageDataUrl);
        
        // Update upload date for the current subtopic
        const subtopic = findTopicById(currentSubtopicId);
        if (subtopic) {
            subtopic.uploadDate = new Date().toISOString();
            subtopic.lastModified = new Date().toISOString();
            saveData();
            renderTopics();
            
            // Update upload date in report view
            const uploadDateEl = document.getElementById('upload-date');
            uploadDateEl.innerHTML = `<i class="fas fa-upload"></i> Image Uploaded: ${formatDate(subtopic.uploadDate)}`;
            uploadDateEl.style.display = 'flex';
        }
        
        // Show the uploaded image
        showUploadedImage(imageDataUrl);
        
        // Hide upload section and show success
        document.getElementById('upload-section').style.display = 'none';
        document.getElementById('report-icon').classList.add('pdf-uploaded');
        
        hideLoading();
        alert('✅ Image uploaded successfully and saved to localStorage!');
    };
    
    reader.onerror = function() {
        alert('Error reading image file.');
        hideLoading();
    };
    
    reader.readAsDataURL(file);
}

function showUploadedImage(imageDataUrl) {
    const imageViewer = document.getElementById('image-viewer');
    const uploadedImage = document.getElementById('uploaded-image');
    
    uploadedImage.src = imageDataUrl;
    imageViewer.style.display = 'block';
}

function removeImage() {
    if (!currentSubtopicId) return;
    
    if (confirm('Are you sure you want to remove this image?')) {
        removeImageFromStorage(currentSubtopicId);
        document.getElementById('image-viewer').style.display = 'none';
        
        // Check if there's still a PDF
        const savedPDF = getPDFFromStorage(currentSubtopicId);
        if (!savedPDF) {
            document.getElementById('upload-section').style.display = 'block';
            document.getElementById('report-icon').classList.remove('pdf-uploaded');
        }
        
        alert('Image removed successfully.');
    }
}

// PDF Upload and handling
function uploadPDF() {
    if (!currentSubtopicId) {
        alert('Please select a PDF folder first.');
        return;
    }
    document.getElementById('pdf-input').click();
}

function handlePDFUpload(event) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
        handlePDFFile(file);
    } else {
        alert('Please select a valid PDF file.');
    }
    
    // Reset the input
    event.target.value = '';
}

function handlePDFFile(file) {
    if (!currentSubtopicId) {
        alert('Please select a PDF folder first.');
        return;
    }
    
    showLoading();
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const arrayBuffer = e.target.result;
        const typedarray = new Uint8Array(arrayBuffer);
        
        pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
            pdfDoc = pdf;
            pageCount = pdf.numPages;
            pageNum = 1;
            
            // Save PDF to localStorage as base64
            const base64String = btoa(String.fromCharCode.apply(null, typedarray));
            savePDFToStorage(currentSubtopicId, base64String);
            
            // Update upload date for the current subtopic
            const subtopic = findTopicById(currentSubtopicId);
            if (subtopic) {
                subtopic.uploadDate = new Date().toISOString();
                subtopic.lastModified = new Date().toISOString();
                saveData();
                renderTopics();
                
                // Update upload date in report view
                const uploadDateEl = document.getElementById('upload-date');
                uploadDateEl.innerHTML = `<i class="fas fa-upload"></i> PDF Uploaded: ${formatDate(subtopic.uploadDate)}`;
                uploadDateEl.style.display = 'flex';
            }
            
            // Hide folder icon and show PDF viewer
            document.getElementById('report-icon').classList.add('pdf-uploaded');
            document.getElementById('upload-section').style.display = 'none';
            document.getElementById('pdf-viewer').style.display = 'block';
            document.getElementById('excel-btn').style.display = 'inline-flex';
            
            renderPage(pageNum);
            hideLoading();
            
            alert('✅ PDF uploaded successfully and saved to localStorage!');
            
        }).catch(function(error) {
            console.error('Error loading PDF:', error);
            alert('Error loading PDF file: ' + error.message);
            hideLoading();
        });
    };
    
    reader.onerror = function() {
        alert('Error reading PDF file.');
        hideLoading();
    };
    
    reader.readAsArrayBuffer(file);
}

function loadSavedPDF(savedPDF) {
    showLoading();
    
    try {
        // Decode base64 to binary
        const binaryString = atob(savedPDF);
        const arrayBuffer = new ArrayBuffer(binaryString.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < binaryString.length; i++) {
            uint8Array[i] = binaryString.charCodeAt(i);
        }
        
        const typedarray = new Uint8Array(arrayBuffer);
        
        pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
            pdfDoc = pdf;
            pageCount = pdf.numPages;
            pageNum = 1;
            
            // Hide folder icon and show PDF viewer
            document.getElementById('report-icon').classList.add('pdf-uploaded');
            document.getElementById('pdf-viewer').style.display = 'block';
            document.getElementById('excel-btn').style.display = 'inline-flex';
            
            renderPage(pageNum);
            hideLoading();
        }).catch(function(error) {
            console.error('Error loading saved PDF:', error);
            // Clear invalid saved PDF
            localStorage.removeItem(`pdf_${currentSubtopicId}`);
            hideLoading();
        });
    } catch (error) {
        console.error('Error processing saved PDF:', error);
        // Clear invalid saved PDF
        if (currentSubtopicId) {
            localStorage.removeItem(`pdf_${currentSubtopicId}`);
        }
        hideLoading();
    }
}

// PDF rendering functions
function renderPage(num) {
    if (!pdfDoc) return;
    
    pdfDoc.getPage(num).then(function(page) {
        const viewport = page.getViewport({ scale: scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        
        page.render(renderContext);
        
        // Update page info
        document.getElementById('page-info').textContent = `Page ${num} of ${pageCount}`;
    });
}

function prevPage() {
    if (pageNum <= 1) return;
    pageNum--;
    renderPage(pageNum);
}

function nextPage() {
    if (pageNum >= pageCount) return;
    pageNum++;
    renderPage(pageNum);
}

function zoomIn() {
    scale += 0.2;
    renderPage(pageNum);
}

function zoomOut() {
    if (scale <= 0.4) return;
    scale -= 0.2;
    renderPage(pageNum);
}

// Convert PDF to Excel
function convertToExcel() {
    if (!currentSubtopicId) {
        alert('Please select a PDF folder first.');
        return;
    }
    
    if (!pdfDoc) {
        alert('Please upload a PDF first.');
        return;
    }
    
    showLoading();
    
    // Extract text from PDF and convert to Excel
    extractPDFText().then(function(textData) {
        try {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(textData);
            XLSX.utils.book_append_sheet(wb, ws, 'PDF_Data');
            
            // Save Excel file as base64
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const excelBase64 = btoa(String.fromCharCode.apply(null, new Uint8Array(excelBuffer)));
            localStorage.setItem(`excel_${currentSubtopicId}`, excelBase64);
            
            hideLoading();
            alert('PDF converted to Excel successfully! Click "Download Excel" to save the file.');
        } catch (error) {
            console.error('Error creating Excel file:', error);
            hideLoading();
            alert('Error converting PDF to Excel: ' + error.message);
        }
    }).catch(function(error) {
        console.error('Error converting PDF to Excel:', error);
        alert('Error converting PDF to Excel: ' + error.message);
        hideLoading();
    });
}

async function extractPDFText() {
    const textData = [];
    
    try {
        // Add headers
        textData.push(['Page', 'Content']);
        
        for (let i = 1; i <= pageCount; i++) {
            const page = await pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            
            let pageText = '';
            textContent.items.forEach(item => {
                if (item.str && item.str.trim()) {
                    pageText += item.str + ' ';
                }
            });
            
            // Add page data as a row
            if (pageText.trim()) {
                textData.push([`Page ${i}`, pageText.trim()]);
            } else {
                textData.push([`Page ${i}`, 'No text content found']);
            }
        }
        
        // If no text was extracted, add a default row
        if (textData.length === 1) {
            textData.push(['No Data', 'No text content could be extracted from this PDF']);
        }
        
        return textData;
    } catch (error) {
        console.error('Error extracting PDF text:', error);
        return [['Error', 'Failed to extract text from PDF: ' + error.message]];
    }
}

function downloadAsExcel() {
    if (!currentSubtopicId) {
        alert('Please select a PDF folder first.');
        return;
    }
    
    const excelBase64 = localStorage.getItem(`excel_${currentSubtopicId}`);
    if (!excelBase64) {
        alert('No Excel data found. Please convert the PDF first.');
        return;
    }
    
    try {
        // Convert base64 back to binary
        const binaryString = atob(excelBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${document.getElementById('report-title').textContent.replace(/[^a-z0-9]/gi, '_')}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading Excel file:', error);
        alert('Error downloading Excel file: ' + error.message);
    }
}

// Export to PDF
function exportToPDF() {
    if (!currentSubtopicId) {
        alert('Please select a PDF folder first.');
        return;
    }
    
    const savedPDF = getPDFFromStorage(currentSubtopicId);
    if (!savedPDF) {
        alert('No PDF found for this report.');
        return;
    }
    
    try {
        // Convert base64 back to binary
        const binaryString = atob(savedPDF);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${document.getElementById('report-title').textContent.replace(/[^a-z0-9]/gi, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting PDF:', error);
        alert('Error exporting PDF: ' + error.message);
    }
}

// Print report
function printReport() {
    if (!currentSubtopicId) {
        alert('Please select a PDF folder first.');
        return;
    }
    
    if (pdfDoc) {
        window.print();
    } else {
        alert('No PDF loaded for printing.');
    }
}

// Set date range
function setDateRange() {
    const startDate = prompt('Enter start date (YYYY-MM-DD):');
    const endDate = prompt('Enter end date (YYYY-MM-DD):');
    
    if (startDate && endDate) {
        alert(`Date range set: ${startDate} to ${endDate}`);
        // Store date range for current report
        if (currentSubtopicId) {
            localStorage.setItem(`dateRange_${currentSubtopicId}`, JSON.stringify({ startDate, endDate }));
        }
    }
}

// Modal functions
function closeModal() {
    document.getElementById('topic-modal').style.display = 'none';
}

function closeSubtopicModal() {
    document.getElementById('subtopic-modal').style.display = 'none';
}

// Loading functions
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // ESC to close modals
    if (e.key === 'Escape') {
        closeModal();
        closeSubtopicModal();
        closeRenameModal();
    }
    
    // Enter to submit forms in modals
    if (e.key === 'Enter') {
        if (document.getElementById('topic-modal').style.display === 'block') {
            createTopic();
        } else if (document.getElementById('subtopic-modal').style.display === 'block') {
            createSubtopic();
        } else if (document.getElementById('rename-modal').style.display === 'block') {
            confirmRename();
        }
    }
    
    if (pdfDoc && document.getElementById('pdf-viewer').style.display === 'block') {
        if (e.key === 'ArrowLeft') {
            prevPage();
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            nextPage();
            e.preventDefault();
        } else if (e.key === '+' || e.key === '=') {
            zoomIn();
            e.preventDefault();
        } else if (e.key === '-') {
            zoomOut();
            e.preventDefault();
        }
    }
});

// Click outside modal to close
window.onclick = function(event) {
    const topicModal = document.getElementById('topic-modal');
    const subtopicModal = document.getElementById('subtopic-modal');
    const renameModal = document.getElementById('rename-modal');
    
    if (event.target === topicModal) {
        closeModal();
    }
    if (event.target === subtopicModal) {
        closeSubtopicModal();
    }
    if (event.target === renameModal) {
        closeRenameModal();
    }
};