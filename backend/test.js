const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');

// CSV file paths for different test types
const TEST_FILES = {
    '1': path.join(__dirname, '../../aptitude_questions.csv'), // Cognitive Skills
    '2': path.join(__dirname, '../../technical_questions.csv'), // Technical Skills
    '3': path.join(__dirname, '../../soft_skills_questions.csv')  // Soft Skills
};

// Add CORS headers middleware
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

// Store active test sessions
const activeSessions = {};

// Initialize a new test session
router.post('/initialize', async (req, res) => {
    try {
        const { testType, level, questionCount, timeLimit, domain } = req.body;
        
        // Input validation
        if (!testType || !level || !questionCount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: testType, level, questionCount'
            });
        }

        // Generate a unique session ID with high entropy to ensure different question sets
        const timestamp = Date.now();
        const randomPart = Math.random().toString(36).substring(2, 15);
        const sessionId = `test_${timestamp}_${randomPart}`;
        
        // Map frontend test types to Python quiz types
        const quizTypeMap = {
            'aptitude': '1', // Cognitive Skills
            'technical': '2', // Technical Skills
            'softSkills': '3'  // Soft Skills
        };
        
        // Map frontend levels to Python quiz levels
        const levelMap = {
            'beginner': 'Beginner',
            'intermediate': 'Intermediate',
            'advanced': 'Advanced'
        };
        
        // Store session configuration
        activeSessions[sessionId] = {
            testType,
            quizType: quizTypeMap[testType] || '1',
            level: levelMap[level] || 'Intermediate',
            questionCount: parseInt(questionCount),
            timeLimit: parseInt(timeLimit) || 30,
            domain: domain || 'all',
            questions: [],
            currentQuestion: 0,
            answers: [],
            startTime: Date.now()
        };
        
        console.log(`Initializing session ${sessionId} with config:`, activeSessions[sessionId]);
        
        // Store test session in database (async)
        try {
            const sessionData = {
                session_id: sessionId,
                test_type: testType,
                level: levelMap[level] || 'Intermediate',
                domain: domain || 'all',
                question_count: parseInt(questionCount),
                time_limit: parseInt(timeLimit) || 30
            };
            
            // Don't wait for database storage to complete
            storeSessionInDatabase(sessionData).catch(err => {
                console.error('Database storage error:', err);
            });
        } catch (dbError) {
            console.error('Database storage error:', dbError);
            // Continue even if database storage fails
        }
        
        // Load questions from Python script
        try {
            await loadQuestionsFromPython(sessionId);
            
            // Return session info and first question
            const session = activeSessions[sessionId];
            
            if (!session.questions || session.questions.length === 0) {
                delete activeSessions[sessionId];
                return res.status(500).json({
                    success: false,
                    message: 'No questions could be loaded for this configuration'
                });
            }

            const firstQuestion = session.questions[0];
            
            res.json({
                success: true,
                message: 'Test session initialized successfully',
                data: {
                    sessionId,
                    totalQuestions: session.questions.length,
                    timeLimit: session.timeLimit,
                    firstQuestion: {
                        questionNumber: 1,
                        question: firstQuestion.question,
                        options: [
                            firstQuestion.option_a,
                            firstQuestion.option_b,
                            firstQuestion.option_c,
                            firstQuestion.option_d
                        ]
                    }
                }
            });
        } catch (error) {
            console.error('Error loading questions:', error);
            delete activeSessions[sessionId];
            return res.status(500).json({
                success: false,
                message: 'Failed to load questions',
                error: error.message
            });
        }
    } catch (error) {
        console.error('Test initialization error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initialize test',
            error: error.message
        });
    }
});

// Get a question for the current session
router.get('/question/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = activeSessions[sessionId];
        
        console.log(`Getting question for session ${sessionId}, current question index: ${session?.currentQuestion}`);
        
        if (!session) {
            console.log(`Session ${sessionId} not found`);
            return res.status(404).json({
                success: false,
                message: 'Test session not found'
            });
        }
        
        // Check if all questions have been answered
        if (session.currentQuestion >= session.questions.length) {
            console.log(`All questions answered for session ${sessionId}`);
            return res.json({
                success: true,
                data: {
                    completed: true,
                    totalQuestions: session.questions.length,
                    answeredQuestions: session.answers.length
                }
            });
        }
        
        // Get current question
        const question = session.questions[session.currentQuestion];
        console.log(`Serving question ${session.currentQuestion + 1}/${session.questions.length} for session ${sessionId}`);
        
        res.json({
            success: true,
            data: {
                completed: false,
                questionNumber: session.currentQuestion + 1,
                totalQuestions: session.questions.length,
                question: {
                    question: question.question,
                    options: [
                        question.option_a,
                        question.option_b,
                        question.option_c,
                        question.option_d
                    ]
                }
            }
        });
    } catch (error) {
        console.error('Get question error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get question',
            error: error.message
        });
    }
});

// Submit an answer
router.post('/answer', async (req, res) => {
    try {
        const { sessionId, answer, questionNumber } = req.body;
        console.log(`Submitting answer for session ${sessionId}, question ${questionNumber}, answer: ${answer}`);
        
        // Input validation
        if (!sessionId || answer === undefined || !questionNumber) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: sessionId, answer, questionNumber'
            });
        }

        const session = activeSessions[sessionId];
        
        if (!session) {
            console.log(`Session ${sessionId} not found when submitting answer`);
            return res.status(404).json({
                success: false,
                message: 'Test session not found'
            });
        }

        // Validate question number
        if (questionNumber < 1 || questionNumber > session.questions.length) {
            return res.status(400).json({
                success: false,
                message: 'Invalid question number'
            });
        }
        
        // Store the answer
        const arrayIndex = questionNumber - 1;
        session.answers[arrayIndex] = answer;
        console.log(`Stored answer ${answer} for question ${questionNumber}`);
        
        // Store the answer in the database (async)
        try {
            const question = session.questions[arrayIndex];
            if (question) {
                const answerData = {
                    session_id: sessionId,
                    question: question,
                    chosen_option: answer,
                    is_correct: answer.toUpperCase() === question.correct_option.toUpperCase(),
                    time_taken: Math.round((Date.now() - session.startTime) / 1000),
                    quiz_type: session.quizType
                };
                
                // Don't wait for database storage to complete
                storeAnswerInDatabase(answerData).catch(err => {
                    console.error('Database storage error:', err);
                });
            }
        } catch (dbError) {
            console.error('Database storage error:', dbError);
            // Continue even if database storage fails
        }
        
        // Move to next question if answering current question
        if (arrayIndex === session.currentQuestion) {
            session.currentQuestion++;
            console.log(`Advanced to next question. Current question is now ${session.currentQuestion}`);
        }
        
        // Check if test is completed
        const isCompleted = session.currentQuestion >= session.questions.length;
        
        res.json({
            success: true,
            message: 'Answer submitted successfully',
            data: {
                completed: isCompleted,
                currentQuestion: session.currentQuestion + 1,
                totalQuestions: session.questions.length
            }
        });
    } catch (error) {
        console.error('Submit answer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit answer',
            error: error.message
        });
    }
});

// Get test results
router.get('/results/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = activeSessions[sessionId];
        
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Test session not found'
            });
        }
        
        // Calculate results
        const results = calculateResults(session);
        
        // Store test results in database (async)
        try {
            const resultsData = {
                session_id: sessionId,
                score: results.score,
                correct_answers: results.correctAnswers,
                total_questions: results.totalQuestions,
                time_taken: results.timeTaken,
                strengths: results.strengths,
                weaknesses: results.weaknesses,
                recommendations: results.recommendations
            };
            
            // Don't wait for database storage to complete
            storeResultsInDatabase(resultsData).catch(err => {
                console.error('Database storage error:', err);
            });
        } catch (dbError) {
            console.error('Database storage error:', dbError);
            // Continue even if database storage fails
        }
        
        // Clean up session data
        delete activeSessions[sessionId];
        
        res.json({
            success: true,
            data: {
                testType: session.testType,
                level: session.level,
                domain: session.domain,
                results
            }
        });
    } catch (error) {
        console.error('Get results error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get results',
            error: error.message
        });
    }
});

// Get session status
router.get('/status/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = activeSessions[sessionId];
        
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Test session not found'
            });
        }
        
        res.json({
            success: true,
            data: {
                sessionId,
                testType: session.testType,
                level: session.level,
                totalQuestions: session.questions.length,
                currentQuestion: session.currentQuestion + 1,
                answeredQuestions: session.answers.filter(a => a !== undefined).length,
                timeElapsed: Math.round((Date.now() - session.startTime) / 1000),
                timeLimit: session.timeLimit * 60 // Convert to seconds
            }
        });
    } catch (error) {
        console.error('Get status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get session status',
            error: error.message
        });
    }
});

// Helper function to load questions from Python script
function loadQuestionsFromPython(sessionId) {
    return new Promise((resolve, reject) => {
        try {
            const session = activeSessions[sessionId];
            if (!session) {
                return reject(new Error('Session not found'));
            }
            
            // Create configuration for Python script
            const configData = {
                quiz_type: session.quizType,
                num_questions: session.questionCount,
                duration: session.timeLimit,
                level: session.level,
                domain: session.domain,
                session_id: sessionId
            };
            
            console.log('Loading questions with config:', configData);
            
            // Spawn Python process
            const pythonProcess = spawn('python', [
                path.join(__dirname, '../../backend-pycode.py'),
                JSON.stringify(configData)
            ], {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            let dataString = '';
            let errorString = '';
            
            // Collect data from Python script
            pythonProcess.stdout.on('data', (data) => {
                dataString += data.toString();
            });
            
            // Handle errors
            pythonProcess.stderr.on('data', (data) => {
                errorString += data.toString();
                console.error(`Python Error: ${data}`);
            });
            
            // Set timeout for Python process
            const timeout = setTimeout(() => {
                pythonProcess.kill();
                reject(new Error('Python process timeout'));
            }, 30000); // 30 seconds timeout
            
            // Process completed
            pythonProcess.on('close', (code) => {
                clearTimeout(timeout);
                
                if (code !== 0) {
                    console.error(`Python process exited with code ${code}`);
                    console.error(`Python stderr: ${errorString}`);
                    return reject(new Error(`Python process exited with code ${code}: ${errorString}`));
                }
                
                try {
                    // Parse the questions from Python output
                    const questions = JSON.parse(dataString);
                    if (!Array.isArray(questions) || questions.length === 0) {
                        throw new Error('No questions returned from Python script');
                    }
                    
                    session.questions = questions;
                    console.log(`Loaded ${questions.length} questions successfully`);
                    resolve();
                } catch (error) {
                    console.error('Failed to parse Python output:', error);
                    console.error('Python output:', dataString);
                    reject(new Error(`Failed to parse Python output: ${error.message}`));
                }
            });

            pythonProcess.on('error', (error) => {
                clearTimeout(timeout);
                console.error('Python process error:', error);
                reject(error);
            });
            
        } catch (error) {
            console.error('Error in loadQuestionsFromPython:', error);
            reject(error);
        }
    });
}

// Helper function to store session in database
async function storeSessionInDatabase(sessionData) {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [
            path.join(__dirname, '../../store_session.py'),
            JSON.stringify(sessionData)
        ]);
        
        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python Error: ${data}`);
        });
        
        pythonProcess.on('close', (code) => {
            if (code === 0) {
                console.log('Session stored in database successfully');
                resolve();
            } else {
                reject(new Error(`Session storage failed with code ${code}`));
            }
        });

        pythonProcess.on('error', (error) => {
            reject(error);
        });
    });
}

// Helper function to store answer in database
async function storeAnswerInDatabase(answerData) {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [
            path.join(__dirname, '../../store_answer.py'),
            JSON.stringify(answerData)
        ]);
        
        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python Error: ${data}`);
        });
        
        pythonProcess.on('close', (code) => {
            if (code === 0) {
                console.log('Answer stored in database successfully');
                resolve();
            } else {
                reject(new Error(`Answer storage failed with code ${code}`));
            }
        });

        pythonProcess.on('error', (error) => {
            reject(error);
        });
    });
}

// Helper function to store results in database
async function storeResultsInDatabase(resultsData) {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [
            path.join(__dirname, '../../store_results.py'),
            JSON.stringify(resultsData)
        ]);
        
        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python Error: ${data}`);
        });
        
        pythonProcess.on('close', (code) => {
            if (code === 0) {
                console.log('Results stored in database successfully');
                resolve();
            } else {
                reject(new Error(`Results storage failed with code ${code}`));
            }
        });

        pythonProcess.on('error', (error) => {
            reject(error);
        });
    });
}

// Helper function to calculate test results
function calculateResults(session) {
    // Calculate score
    let correctAnswers = 0;
    session.questions.forEach((question, index) => {
        // Handle both formats: index-based answers and letter-based answers
        if (typeof session.answers[index] === 'number') {
            // Index-based answer (0-3 for A-D)
            const correctOption = ['A', 'B', 'C', 'D'].indexOf(question.correct_option.toUpperCase());
            if (session.answers[index] === correctOption) {
                correctAnswers++;
            }
        } else if (typeof session.answers[index] === 'string') {
            // Letter-based answer (A, B, C, D)
            if (session.answers[index].toUpperCase() === question.correct_option.toUpperCase()) {
                correctAnswers++;
            }
        }
    });
    
    const score = Math.round((correctAnswers / session.questions.length) * 100);
    const timeTaken = Math.round((Date.now() - session.startTime) / 1000);
    
    // Generate performance level
    let performanceLevel = 'Needs Improvement';
    if (score >= 80) performanceLevel = 'Excellent';
    else if (score >= 70) performanceLevel = 'Good';
    else if (score >= 60) performanceLevel = 'Average';
    
    // Generate strengths, weaknesses, and recommendations based on test type and score
    let strengths = [];
    let weaknesses = [];
    let recommendations = [];
    let careerRecommendations = { careerPaths: [] };
    
    if (session.testType === 'aptitude') {
        // Cognitive skills assessment
        if (score >= 80) {
            strengths.push('Strong analytical thinking');
            strengths.push('Excellent problem-solving abilities');
            strengths.push('Good pattern recognition');
            recommendations.push('Consider advanced cognitive challenges');
            recommendations.push('Explore leadership roles');
        } else if (score >= 60) {
            strengths.push('Decent analytical thinking');
            strengths.push('Good problem-solving in some areas');
            weaknesses.push('Could improve pattern recognition');
            recommendations.push('Practice more logic puzzles');
            recommendations.push('Work on time management');
        } else {
            weaknesses.push('Needs improvement in analytical thinking');
            weaknesses.push('Difficulty with complex problem-solving');
            recommendations.push('Start with basic logic exercises');
            recommendations.push('Consider a structured learning approach');
        }
        
        careerRecommendations.careerPaths = [
            'Data Analyst',
            'Business Analyst',
            'Research Scientist',
            'Software Engineer'
        ];
    } else if (session.testType === 'technical') {
        // Technical skills assessment
        if (score >= 80) {
            strengths.push('Strong technical knowledge');
            strengths.push('Good understanding of programming concepts');
            strengths.push('Solid problem-solving skills');
            recommendations.push('Consider specializing in advanced technologies');
            recommendations.push('Mentor junior developers');
        } else if (score >= 60) {
            strengths.push('Decent technical foundation');
            weaknesses.push('Some gaps in technical knowledge');
            recommendations.push('Focus on strengthening core concepts');
            recommendations.push('Practice coding regularly');
        } else {
            weaknesses.push('Significant gaps in technical knowledge');
            weaknesses.push('Needs improvement in programming fundamentals');
            recommendations.push('Start with basics and build up gradually');
            recommendations.push('Take structured programming courses');
        }
        
        careerRecommendations.careerPaths = [
            'Software Developer',
            'Web Developer',
            'DevOps Engineer',
            'Database Administrator'
        ];
    } else if (session.testType === 'softSkills') {
        // Soft skills assessment
        if (score >= 80) {
            strengths.push('Excellent communication skills');
            strengths.push('Strong interpersonal abilities');
            strengths.push('Good emotional intelligence');
            recommendations.push('Consider team leadership roles');
            recommendations.push('Develop coaching skills');
        } else if (score >= 60) {
            strengths.push('Decent communication skills');
            weaknesses.push('Could improve active listening');
            recommendations.push('Practice more group discussions');
            recommendations.push('Work on conflict resolution');
        } else {
            weaknesses.push('Needs improvement in communication');
            weaknesses.push('Difficulty with conflict resolution');
            recommendations.push('Consider communication workshops');
            recommendations.push('Practice public speaking');
        }
        
        careerRecommendations.careerPaths = [
            'Project Manager',
            'Team Lead',
            'Customer Success Manager',
            'HR Specialist'
        ];
    }
    
    return {
        score,
        performanceLevel,
        correctAnswers,
        totalQuestions: session.questions.length,
        accuracy: Math.round((correctAnswers / session.questions.length) * 100),
        timeTaken,
        averageTimePerQuestion: Math.round(timeTaken / session.questions.length),
        strengths,
        weaknesses,
        recommendations,
        careerRecommendations
    };
}

module.exports = router;