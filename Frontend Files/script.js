document.addEventListener('DOMContentLoaded', function() {
    // Initialize auth modal
    initAuthModal();
    
    // Initialize smooth scrolling for all anchor links
    initSmoothScrolling();
    
    // Initialize tab navigation for assessment and login sections
    initTabNavigation();
    
    // Initialize mobile navigation
    initMobileNavigation();
    
    // Initialize scroll animations
    initScrollAnimations();
    
    // Initialize assessment form handlers
    initAssessmentHandlers();
    
    // Initialize user profile menu
    initUserProfileMenu();
    
    // Initialize profile tabs
    initProfileTabs();
});

// Auth modal functionality
function initAuthModal() {
    const authModal = document.getElementById('auth-modal');
    const loginButton = document.getElementById('login-button');
    const signupButton = document.getElementById('signup-button');
    const closeModalBtn = document.getElementById('close-auth-modal');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    // Open modal with login form active
    if (loginButton && authModal) {
        loginButton.addEventListener('click', function() {
            authModal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
            
            // Ensure login tab is active
            const loginTab = document.getElementById('login-tab');
            if (loginTab) loginTab.click();
        });
    }
    
    // Open modal with signup form active
    if (signupButton && authModal) {
        signupButton.addEventListener('click', function() {
            authModal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
            
            // Ensure signup tab is active
            const signupTab = document.getElementById('signup-tab');
            if (signupTab) signupTab.click();
        });
    }
    
    // Close modal
    if (closeModalBtn && authModal) {
        closeModalBtn.addEventListener('click', function() {
            authModal.classList.remove('active');
            document.body.style.overflow = ''; // Restore scrolling
        });
    }
    
    // Close modal when clicking outside of it
    if (authModal) {
        authModal.addEventListener('click', function(e) {
            if (e.target === authModal) {
                authModal.classList.remove('active');
                document.body.style.overflow = ''; // Restore scrolling
            }
        });
    }
    
    // Handle login form submission
    if (loginForm && authModal) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // In a real application, you would validate and process login here
            authModal.classList.remove('active');
            document.body.style.overflow = ''; // Restore scrolling
            alert('Login successful!'); // Placeholder for actual login logic
        });
    }
    
    // Handle signup form submission
    if (signupForm && authModal) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // In a real application, you would validate and process signup here
            authModal.classList.remove('active');
            document.body.style.overflow = ''; // Restore scrolling
            alert('Account created successfully!'); // Placeholder for actual signup logic
        });
    }
}

// User profile menu functionality
function initUserProfileMenu() {
    const userProfileIcon = document.getElementById('user-profile');
    if (userProfileIcon) {
        userProfileIcon.addEventListener('click', function(e) {
            // If we're not on the profile page, navigate to it
            if (!window.location.href.includes('user-profile.html')) {
                window.location.href = 'user-profile.html';
            }
        });
    }
}

function initProfileTabs() {
    // Only run this on the profile page
    if (!window.location.href.includes('user-profile.html')) return;
    
    const profileNav = document.querySelector('.profile-nav');
    const profileTabs = document.querySelectorAll('.profile-tab');
    
    if (profileNav && profileTabs.length > 0) {
        const navItems = profileNav.querySelectorAll('li');
        
        navItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Get the target tab ID from the href attribute
                const targetId = this.querySelector('a').getAttribute('href').substring(1);
                
                // Remove active class from all nav items and tabs
                navItems.forEach(navItem => navItem.classList.remove('active'));
                profileTabs.forEach(tab => tab.classList.remove('active'));
                
                // Add active class to clicked nav item and corresponding tab
                this.classList.add('active');
                document.getElementById(targetId).classList.add('active');
            });
        });
        
        // Handle logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                alert('Logout functionality would be implemented here.');
                // In a real implementation, this would clear session data and redirect to home
                // window.location.href = 'index.html';
            });
        }
        
        // Form submission handlers
        const settingsForms = document.querySelectorAll('.settings-form');
        settingsForms.forEach(form => {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                alert('Settings saved successfully!');
            });
        });
        
        // Account management buttons
        const downloadDataBtn = document.querySelector('.download-data-btn');
        const deleteAccountBtn = document.querySelector('.delete-account-btn');
        
        if (downloadDataBtn) {
            downloadDataBtn.addEventListener('click', function() {
                alert('Your data is being prepared for download.');
            });
        }
        
        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', function() {
                const confirmed = confirm('Are you sure you want to delete your account? This action cannot be undone.');
                if (confirmed) {
                    alert('Account deletion request submitted.');
                }
            });
        }
    }
}

// Smooth scrolling for anchor links
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 70, // Adjust for header height
                    behavior: 'smooth'
                });
                
                // Close mobile menu if open
                const navLinks = document.querySelector('.nav-links');
                const burger = document.querySelector('.burger');
                if (navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                    burger.classList.remove('active');
                }
            }
        });
    });
}

// Tab navigation for assessment and login sections
function initTabNavigation() {
    // Assessment tabs
    const assessmentTabBtns = document.querySelectorAll('.tab-btn');
    const assessmentTabPanes = document.querySelectorAll('.tab-pane');
    
    assessmentTabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons and panes
            assessmentTabBtns.forEach(b => b.classList.remove('active'));
            assessmentTabPanes.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked button and corresponding pane
            this.classList.add('active');
            const targetPane = document.querySelector(this.getAttribute('data-target'));
            if (targetPane) targetPane.classList.add('active');
        });
    });
    
    // Login/Signup tabs
    const authTabBtns = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form');
    
    authTabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons and forms
            authTabBtns.forEach(b => b.classList.remove('active'));
            authForms.forEach(f => f.classList.remove('active'));
            
            // Add active class to clicked button and corresponding form
            this.classList.add('active');
            const targetForm = document.querySelector(this.getAttribute('data-target'));
            if (targetForm) targetForm.classList.add('active');
        });
    });
}

// Mobile navigation
function initMobileNavigation() {
    const navContainer = document.querySelector('.nav-container');
    const navLinks = document.querySelector('.nav-links');
    
    // Create burger icon if it doesn't exist
    if (!document.querySelector('.burger')) {
        const burger = document.createElement('div');
        burger.className = 'burger';
        burger.innerHTML = '<div class="line1"></div><div class="line2"></div><div class="line3"></div>';
        navContainer.appendChild(burger);
        
        burger.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            burger.classList.toggle('active');
        });
    } else {
        const burger = document.querySelector('.burger');
        burger.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            burger.classList.toggle('active');
        });
    }
}

// Scroll animations
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.fadeInUp');
    
    const checkScroll = function() {
        animatedElements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementPosition < windowHeight * 0.85) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    };
    
    // Set initial state for animated elements
    animatedElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });
    
    // Check elements on scroll
    window.addEventListener('scroll', checkScroll);
    
    // Check elements on initial load
    checkScroll();
}

// Assessment form handlers
function initAssessmentHandlers() {
    // Aptitude test navigation
    const prevBtn = document.querySelector('#prev-question');
    const nextBtn = document.querySelector('#next-question');
    const submitTestBtn = document.querySelector('#submit-test');
    const questionContainers = document.querySelectorAll('.question-container');
    let currentQuestion = 0;
    
    if (prevBtn && nextBtn && submitTestBtn && questionContainers.length > 0) {
        // Show only the first question initially
        questionContainers.forEach((container, index) => {
            if (index === 0) {
                container.style.display = 'block';
            } else {
                container.style.display = 'none';
            }
        });
        
        // Update button states
        updateNavigationButtons();
        
        // Previous button click handler
        prevBtn.addEventListener('click', function() {
            if (currentQuestion > 0) {
                questionContainers[currentQuestion].style.display = 'none';
                currentQuestion--;
                questionContainers[currentQuestion].style.display = 'block';
                updateNavigationButtons();
            }
        });
        
        // Next button click handler
        nextBtn.addEventListener('click', function() {
            if (currentQuestion < questionContainers.length - 1) {
                questionContainers[currentQuestion].style.display = 'none';
                currentQuestion++;
                questionContainers[currentQuestion].style.display = 'block';
                updateNavigationButtons();
            }
        });
        
        // Submit test button click handler
        submitTestBtn.addEventListener('click', function() {
            // Simulate test completion and move to next tab
            const interestsTabBtn = document.querySelector('[data-target="#interests-tab"]');
            if (interestsTabBtn) {
                interestsTabBtn.click();
            }
        });
        
        function updateNavigationButtons() {
            prevBtn.disabled = currentQuestion === 0;
            nextBtn.style.display = currentQuestion < questionContainers.length - 1 ? 'block' : 'none';
            submitTestBtn.style.display = currentQuestion === questionContainers.length - 1 ? 'block' : 'none';
        }
    }
    
    // Option selection for aptitude test
    const optionButtons = document.querySelectorAll('.option-btn');
    optionButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Find all option buttons in the same question container
            const questionContainer = this.closest('.question-container');
            const options = questionContainer.querySelectorAll('.option-btn');
            
            // Remove selected class from all options
            options.forEach(opt => opt.classList.remove('selected'));
            
            // Add selected class to clicked option
            this.classList.add('selected');
        });
    });
    
    // Pattern selection for aptitude test
    const patternOptions = document.querySelectorAll('.pattern-options img');
    patternOptions.forEach(pattern => {
        pattern.addEventListener('click', function() {
            // Find all pattern options in the same question container
            const questionContainer = this.closest('.question-container');
            const patterns = questionContainer.querySelectorAll('.pattern-options img');
            
            // Remove selected border from all patterns
            patterns.forEach(pat => pat.style.border = '2px solid var(--border-color)');
            
            // Add selected border to clicked pattern
            this.style.border = '2px solid var(--primary-color)';
        });
    });
    
    // Skills input handling
    const skillsInput = document.querySelector('#skills-input');
    const skillsTags = document.querySelector('.skills-tags');
    
    if (skillsInput && skillsTags) {
        skillsInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                const skill = this.value.trim();
                if (skill) {
                    addSkillTag(skill);
                    this.value = '';
                }
            }
        });
        
        function addSkillTag(skill) {
            const tag = document.createElement('div');
            tag.className = 'skill-tag';
            tag.innerHTML = `${skill} <i class="fas fa-times"></i>`;
            
            // Add remove functionality
            tag.querySelector('i').addEventListener('click', function() {
                tag.remove();
            });
            
            skillsTags.appendChild(tag);
        }
    }
    
    // Resume upload handling
    const uploadArea = document.querySelector('.upload-area');
    const fileInput = document.querySelector('#resume-file');
    
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', function() {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                const fileName = this.files[0].name;
                const fileInfo = uploadArea.querySelector('p');
                fileInfo.textContent = `Selected file: ${fileName}`;
            }
        });
        
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, unhighlight, false);
        });
        
        function highlight() {
            uploadArea.style.borderColor = 'var(--primary-color)';
            uploadArea.style.backgroundColor = 'rgba(74, 107, 255, 0.05)';
        }
        
        function unhighlight() {
            uploadArea.style.borderColor = 'var(--border-color)';
            uploadArea.style.backgroundColor = '';
        }
        
        // Handle dropped files
        uploadArea.addEventListener('drop', handleDrop, false);
        
        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                fileInput.files = files;
                const fileName = files[0].name;
                const fileInfo = uploadArea.querySelector('p');
                fileInfo.textContent = `Selected file: ${fileName}`;
            }
        }
    }
    
    // Form submission handling
    const assessmentForm = document.querySelector('#assessment-form');
    
    if (assessmentForm) {
        assessmentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Collect form data
            const formData = new FormData(this);
            
            // Collect skills from tags
            const skills = [];
            document.querySelectorAll('.skill-tag').forEach(tag => {
                skills.push(tag.textContent.trim().replace(' ×', ''));
            });
            
            // Simulate AI analysis and generate recommendations
            simulateAIAnalysis(formData, skills);
        });
    }
}

// Simulate AI analysis and generate career recommendations
function simulateAIAnalysis(formData, skills) {
    // Show loading state
    const assessmentSection = document.querySelector('.assessment-section');
    const pathwaysSection = document.querySelector('.pathways-section');
    const skillsGapSection = document.querySelector('.skills-gap-section');
    
    if (assessmentSection && pathwaysSection && skillsGapSection) {
        // Create loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner"></div>
            <p>Analyzing your profile with AI...</p>
        `;
        loadingOverlay.style.position = 'fixed';
        loadingOverlay.style.top = '0';
        loadingOverlay.style.left = '0';
        loadingOverlay.style.width = '100%';
        loadingOverlay.style.height = '100%';
        loadingOverlay.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.flexDirection = 'column';
        loadingOverlay.style.justifyContent = 'center';
        loadingOverlay.style.alignItems = 'center';
        loadingOverlay.style.zIndex = '9999';
        
        const spinner = loadingOverlay.querySelector('.loading-spinner');
        spinner.style.width = '50px';
        spinner.style.height = '50px';
        spinner.style.border = '5px solid var(--border-color)';
        spinner.style.borderTopColor = 'var(--primary-color)';
        spinner.style.borderRadius = '50%';
        spinner.style.animation = 'spin 1s linear infinite';
        
        // Add keyframes for spinner animation
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(loadingOverlay);
        
        // Simulate processing time
        setTimeout(() => {
            // Remove loading overlay
            document.body.removeChild(loadingOverlay);
            
            // Generate career recommendations
            generateCareerRecommendations(skills);
            
            // Scroll to recommendations
            pathwaysSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 2500);
    }
}

// Generate career recommendations based on user input
function generateCareerRecommendations(skills) {
    const recommendationsContainer = document.querySelector('.recommendations-container');
    
    if (recommendationsContainer) {
        // Clear previous recommendations
        recommendationsContainer.innerHTML = '';
        
        // Determine career paths based on skills and interests
        const careerPaths = determineCareerPaths(skills);
        
        // Create career cards
        careerPaths.forEach(career => {
            const careerCard = createCareerCard(career);
            recommendationsContainer.appendChild(careerCard);
        });
        
        // Generate skills gap analysis
        generateSkillsGapAnalysis(careerPaths[0]); // Use the top recommendation for skills gap
    }
}

// Determine career paths based on user input
function determineCareerPaths(skills) {
    // This is a simplified simulation of AI matching logic
    // In a real application, this would involve complex algorithms and API calls
    
    const careerDatabase = [
        {
            title: 'Data Scientist',
            match: 95,
            description: 'Analyze complex data to help organizations make better decisions.',
            strengths: ['Analytical thinking', 'Statistical knowledge', 'Problem-solving'],
            salaryRange: '$90,000 - $150,000',
            growthTrend: '+26%',
            requiredSkills: ['Python', 'Machine Learning', 'Statistics', 'SQL', 'Data Visualization'],
            skillGaps: [
                { name: 'Machine Learning', current: 60, required: 80, level: 'medium' },
                { name: 'Big Data Technologies', current: 30, required: 70, level: 'high' },
                { name: 'Statistical Analysis', current: 75, required: 85, level: 'low' }
            ],
            resources: [
                'Coursera: Machine Learning by Andrew Ng',
                'DataCamp: Data Scientist with Python',
                'Book: Python for Data Analysis'
            ]
        },
        {
            title: 'UX/UI Designer',
            match: 88,
            description: 'Create intuitive, accessible, and visually appealing user interfaces.',
            strengths: ['Creativity', 'User empathy', 'Visual communication'],
            salaryRange: '$75,000 - $120,000',
            growthTrend: '+13%',
            requiredSkills: ['UI Design', 'User Research', 'Wireframing', 'Prototyping', 'Figma/Adobe XD'],
            skillGaps: [
                { name: 'User Research', current: 50, required: 80, level: 'high' },
                { name: 'Interaction Design', current: 65, required: 85, level: 'medium' },
                { name: 'Prototyping', current: 70, required: 75, level: 'low' }
            ],
            resources: [
                'Udemy: UI/UX Design Bootcamp',
                'Nielsen Norman Group: UX Certification',
                'Book: Don\'t Make Me Think by Steve Krug'
            ]
        },
        {
            title: 'Full Stack Developer',
            match: 82,
            description: 'Build complete web applications, working on both client and server sides.',
            strengths: ['Problem-solving', 'Adaptability', 'Technical versatility'],
            salaryRange: '$80,000 - $140,000',
            growthTrend: '+17%',
            requiredSkills: ['JavaScript', 'React/Angular/Vue', 'Node.js', 'SQL/NoSQL', 'Git'],
            skillGaps: [
                { name: 'Backend Development', current: 55, required: 80, level: 'high' },
                { name: 'Frontend Frameworks', current: 70, required: 85, level: 'medium' },
                { name: 'DevOps', current: 40, required: 60, level: 'medium' }
            ],
            resources: [
                'freeCodeCamp: Full Stack Web Development',
                'Udemy: The Web Developer Bootcamp',
                'MDN Web Docs: JavaScript Guide'
            ]
        },
        {
            title: 'AI/ML Engineer',
            match: 79,
            description: 'Develop systems and applications that utilize artificial intelligence and machine learning.',
            strengths: ['Mathematical aptitude', 'Programming skills', 'Research mindset'],
            salaryRange: '$100,000 - $170,000',
            growthTrend: '+31%',
            requiredSkills: ['Python', 'TensorFlow/PyTorch', 'Deep Learning', 'Computer Vision', 'NLP'],
            skillGaps: [
                { name: 'Deep Learning', current: 45, required: 85, level: 'high' },
                { name: 'Neural Networks', current: 50, required: 80, level: 'high' },
                { name: 'Computer Vision', current: 60, required: 75, level: 'medium' }
            ],
            resources: [
                'Coursera: Deep Learning Specialization',
                'Fast.ai: Practical Deep Learning for Coders',
                'Book: Hands-On Machine Learning with Scikit-Learn and TensorFlow'
            ]
        }
    ];
    
    // Simple matching algorithm (in a real app, this would be much more sophisticated)
    const matchedCareers = careerDatabase.map(career => {
        // Calculate a simple match score based on skills overlap
        let matchScore = career.match; // Start with base match from our database
        
        // Adjust match score based on skills (simplified)
        if (skills && skills.length > 0) {
            const skillsLower = skills.map(s => s.toLowerCase());
            const requiredSkillsLower = career.requiredSkills.map(s => s.toLowerCase());
            
            // Count matching skills
            const matchingSkills = skillsLower.filter(s => {
                return requiredSkillsLower.some(rs => rs.includes(s) || s.includes(rs));
            });
            
            // Adjust score based on matching skills
            const skillsAdjustment = (matchingSkills.length / career.requiredSkills.length) * 10;
            matchScore = Math.min(99, Math.max(60, matchScore + skillsAdjustment - 5));
        }
        
        return {
            ...career,
            match: Math.round(matchScore)
        };
    });
    
    // Sort by match score
    return matchedCareers.sort((a, b) => b.match - a.match);
}

// Create a career card element
function createCareerCard(career) {
    const card = document.createElement('div');
    card.className = 'career-card fadeInUp';
    
    card.innerHTML = `
        <div class="card-header">
            <h3>${career.title}</h3>
            <span class="match-badge">${career.match}% Match</span>
        </div>
        <div class="card-body">
            <p class="description">${career.description}</p>
            <div class="match-details">
                <h4>Your Strengths</h4>
                <ul>
                    ${career.strengths.map(strength => `<li>${strength}</li>`).join('')}
                </ul>
            </div>
            <div class="salary-info">
                <span class="salary-range">${career.salaryRange}</span>
                <span class="growth-trend positive">${career.growthTrend} Growth</span>
            </div>
        </div>
        <div class="card-footer">
            <button class="view-details-btn" data-career="${career.title}">View Details</button>
            <button class="save-career-btn" title="Save to favorites"><i class="far fa-bookmark"></i></button>
        </div>
    `;
    
    // Add event listener to view details button
    const viewDetailsBtn = card.querySelector('.view-details-btn');
    viewDetailsBtn.addEventListener('click', function() {
        // Generate skills gap analysis for this career
        generateSkillsGapAnalysis(career);
        
        // Scroll to skills gap section
        document.querySelector('.skills-gap-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    
    // Add event listener to save button
    const saveBtn = card.querySelector('.save-career-btn');
    saveBtn.addEventListener('click', function() {
        this.innerHTML = '<i class="fas fa-bookmark"></i>';
        this.style.color = 'var(--primary-color)';
    });
    
    return card;
}

// Generate skills gap analysis
function generateSkillsGapAnalysis(career) {
    const skillsGapSection = document.querySelector('.skills-gap-section');
    
    if (skillsGapSection) {
        // Update selected career title
        const selectedCareerTitle = skillsGapSection.querySelector('.selected-career h3');
        if (selectedCareerTitle) {
            selectedCareerTitle.textContent = `Skills Gap Analysis for ${career.title}`;
        }
        
        // Generate skills gap list
        const skillsGapList = skillsGapSection.querySelector('.skills-gap-list');
        if (skillsGapList) {
            skillsGapList.innerHTML = '';
            
            career.skillGaps.forEach(skill => {
                const skillItem = document.createElement('div');
                skillItem.className = 'skill-gap-item fadeInUp';
                
                skillItem.innerHTML = `
                    <div class="skill-header">
                        <h4>${skill.name}</h4>
                        <span class="gap-level ${skill.level}">${skill.level.charAt(0).toUpperCase() + skill.level.slice(1)} Gap</span>
                    </div>
                    <div class="skill-progress">
                        <div class="progress-labels">
                            <span>Current: ${skill.current}%</span>
                            <span>Required: ${skill.required}%</span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar">
                                <div class="progress-current" style="width: ${skill.current}%"></div>
                            </div>
                            <div class="progress-required" style="left: ${skill.required}%"></div>
                        </div>
                    </div>
                    <div class="recommended-resources">
                        <h5>Recommended Resources</h5>
                        <ul>
                            ${career.resources.map(resource => `<li>${resource}</li>`).join('')}
                        </ul>
                    </div>
                `;
                
                skillsGapList.appendChild(skillItem);
            });
        }
    }
}