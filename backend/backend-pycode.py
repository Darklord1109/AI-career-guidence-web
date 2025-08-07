import pandas as pd
import random
import time
from datetime import datetime, timedelta
import json
import os
import sys
import psycopg2

# Add the Backend Files directory to the Python path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Backend Files'))

# Import the generate_session_id function and get_db_connection from db_config
# Use the correct path to db_config.py in the root directory
from db_config import generate_session_id, get_db_connection


class QuizSystem:
    # Class variable to track recently used questions across sessions
    # Format: {quiz_type: {question_id: timestamp}}
    recently_used_questions = {
        '1': {},  # Cognitive Skills
        '2': {},  # Technical Skills
        '3': {}   # Soft Skills
    }
    
    # How long to consider a question as "recently used" (in seconds)
    QUESTION_COOLDOWN = 3600  # 1 hour
    
    def __init__(self):
        self.quiz_types = {
            '1': {'name': 'Cognitive Skills', 'file': 'cognitive_skills.csv'},
            '2': {'name': 'Technical Skills', 'file': 'technical_skills.csv'},
            '3': {'name': 'Soft Skills', 'file': 'soft_skills.csv'}
        }
        self.current_quiz = None
        self.questions = []
        self.user_answers = []
        self.start_time = None
        self.end_time = None
        self.quiz_config = {}
        
        # Clean up old entries in recently_used_questions
        self._cleanup_recently_used()
        
    def load_csv_data(self, file_path):
        """Load questions from CSV file"""
        try:
            # Get the directory of the current script
            base_dir = os.path.dirname(os.path.abspath(__file__))
            absolute_path = os.path.join(base_dir, file_path)
            
            df = pd.read_csv(absolute_path)
            return df.to_dict('records')
        except FileNotFoundError:
            print(f"Error: CSV file '{file_path}' not found.")
            return []
        except Exception as e:
            print(f"Error loading CSV: {e}")
            return []
    
    def display_quiz_options(self):
        """Display available quiz types"""
        print("\n" + "="*50)
        print("QUIZ SYSTEM - Choose Your Assessment Type")
        print("="*50)
        for key, value in self.quiz_types.items():
            print(f"{key}. {value['name']}")
        print("="*50)
    
    def get_quiz_selection(self):
        """Get user's quiz type selection"""
        while True:
            try:
                choice = input("\nEnter your choice (1-3): ").strip()
                if choice in self.quiz_types:
                    return choice
                else:
                    print("Invalid choice. Please select 1, 2, or 3.")
            except KeyboardInterrupt:
                print("\nQuiz terminated by user.")
                return None
    
    def get_quiz_configuration(self, quiz_type):
        """Get quiz configuration from user"""
        config = {}
        
        # Get number of questions
        while True:
            try:
                num_questions = int(input("Enter number of questions (1-50): "))
                if 1 <= num_questions <= 50:
                    config['num_questions'] = num_questions
                    break
                else:
                    print("Please enter a number between 1 and 50.")
            except ValueError:
                print("Please enter a valid number.")
        
        # Get duration
        while True:
            try:
                duration = int(input("Enter duration in minutes (5-120): "))
                if 5 <= duration <= 120:
                    config['duration'] = duration
                    break
                else:
                    print("Please enter duration between 5 and 120 minutes.")
            except ValueError:
                print("Please enter a valid number.")
        
        # Get difficulty level
        print("\nDifficulty Levels:")
        print("1. Beginner")
        print("2. Intermediate") 
        print("3. Advanced")
        print("4. Mixed (All levels)")
        
        while True:
            try:
                level_choice = input("Select difficulty level (1-4): ").strip()
                level_map = {
                    '1': 'Beginner',
                    '2': 'Intermediate', 
                    '3': 'Advanced',
                    '4': 'Mixed'
                }
                if level_choice in level_map:
                    config['level'] = level_map[level_choice]
                    break
                else:
                    print("Please select 1, 2, 3, or 4.")
            except KeyboardInterrupt:
                return None
        
        # Get domain (only for technical skills)
        if quiz_type == '2':  # Technical skills
            domains = ['webdev', 'python', 'database', 'cybersecurity', 'machine_learning', 
                      'networking', 'devops', 'cloud_computing', 'programming', 'all']
            
            print(f"\nAvailable domains: {', '.join(domains[:-1])}")
            print("Enter 'all' for mixed domains")
            
            while True:
                domain = input("Enter domain (or 'all' for mixed): ").strip().lower()
                if domain in domains:
                    config['domain'] = domain
                    break
                else:
                    print(f"Please enter a valid domain or 'all'.")
        
        return config
    
    def filter_questions(self, all_questions, config, quiz_type):
        """Filter questions based on user configuration"""
        filtered_questions = all_questions.copy()
        
        # Filter by difficulty level
        if config['level'] != 'Mixed':
            filtered_questions = [q for q in filtered_questions if q['level'] == config['level']]
        
        # Filter by domain for technical skills
        if quiz_type == '2' and config.get('domain') and config['domain'] != 'all':
            filtered_questions = [q for q in filtered_questions if config['domain'] in q['skills'].lower()]
        
        # If not enough questions after filtering, relax constraints
        if len(filtered_questions) < config['num_questions']:
            # Only print warnings in CLI mode, not in API mode
            if not hasattr(self, 'api_mode_active') or not self.api_mode_active:
                print(f"Warning: Only {len(filtered_questions)} questions available with your criteria.")
                print("Including questions from other levels/domains to meet your requirement.")
            filtered_questions = all_questions.copy()
        
        return filtered_questions
    
    def _cleanup_recently_used(self):
        """Clean up old entries in recently_used_questions"""
        current_time = time.time()
        for quiz_type in self.recently_used_questions:
            # Create a copy of keys to avoid modifying dict during iteration
            question_ids = list(self.recently_used_questions[quiz_type].keys())
            for question_id in question_ids:
                timestamp = self.recently_used_questions[quiz_type][question_id]
                if current_time - timestamp > self.QUESTION_COOLDOWN:
                    del self.recently_used_questions[quiz_type][question_id]
    
    def select_random_questions(self, questions, num_questions, session_id=None):
        """Select random questions from filtered list"""
        if len(questions) <= num_questions:
            return questions
            
        # Clean up old entries in recently_used_questions
        self._cleanup_recently_used()
        
        # Ensure we don't repeat questions by using a tracking mechanism
        # We'll use a session ID based seed to make the randomization consistent within a session
        # but different between sessions
        if session_id:
            # Use the session_id to create a seed
            # Extract numeric parts from the session ID if it's a string
            if isinstance(session_id, str):
                # Extract numbers from the session ID string
                numeric_parts = ''.join(c for c in session_id if c.isdigit())
                if numeric_parts:
                    session_seed = int(numeric_parts[:10])  # Use first 10 digits to avoid overflow
                else:
                    session_seed = int(time.time())
            else:
                session_seed = int(time.time())
        else:
            session_seed = int(time.time())
            
        # Set the random seed (debug print removed to avoid JSON parsing issues)
        random.seed(session_seed)
        
        # Get current quiz type
        quiz_type = None
        for key, value in self.quiz_types.items():
            if value['name'] == self.current_quiz:
                quiz_type = key
                break
        
        if quiz_type and len(questions) > num_questions:
            # Prioritize questions that haven't been used recently
            recently_used_ids = self.recently_used_questions.get(quiz_type, {})
            
            # Create a question ID for each question (using hash of question text)
            for q in questions:
                if 'id' not in q:
                    q['id'] = hash(q['question'])
            
            # Separate questions into two groups: not recently used and recently used
            not_recently_used = [q for q in questions if q['id'] not in recently_used_ids]
            recently_used = [q for q in questions if q['id'] in recently_used_ids]
            
            # Sort recently used by how long ago they were used (oldest first)
            recently_used.sort(key=lambda q: recently_used_ids[q['id']])
            
            # Stats logging removed to avoid JSON parsing issues
            
            # Select questions, prioritizing those not recently used
            selected = []
            
            # First, try to fill with not recently used questions
            if len(not_recently_used) >= num_questions:
                selected = random.sample(not_recently_used, num_questions)
            else:
                # Use all not recently used questions
                selected = not_recently_used.copy()
                
                # Fill the rest with recently used questions (oldest first)
                remaining_needed = num_questions - len(selected)
                selected.extend(recently_used[:remaining_needed])
            
            # Mark selected questions as recently used
            current_time = time.time()
            for q in selected:
                self.recently_used_questions.setdefault(quiz_type, {})[q['id']] = current_time
        else:
            # Fallback to simple random selection if we don't have quiz type or not enough questions
            selected = random.sample(questions, num_questions)
        
        # Reset the random seed after selection to avoid affecting other random operations
        random.seed()
        
        return selected
    
    def format_question(self, question_data, question_num):
        """Format question for display"""
        formatted = f"\nQuestion {question_num}:\n"
        formatted += f"{question_data['question']}\n\n"
        formatted += f"A) {question_data['option_a']}\n"
        formatted += f"B) {question_data['option_b']}\n"
        formatted += f"C) {question_data['option_c']}\n"
        formatted += f"D) {question_data['option_d']}\n"
        return formatted
    
    def get_user_answer(self):
        """Get user's answer for current question"""
        while True:
            try:
                answer = input("\nEnter your answer (A/B/C/D) or 'quit' to exit: ").strip().upper()
                if answer in ['A', 'B', 'C', 'D']:
                    return answer
                elif answer == 'QUIT':
                    return None
                else:
                    print("Please enter A, B, C, or D.")
            except KeyboardInterrupt:
                print("\nQuiz terminated by user.")
                return None
    
    def check_time_limit(self, duration_minutes):
        """Check if time limit has been exceeded"""
        if self.start_time:
            elapsed_time = time.time() - self.start_time
            return elapsed_time >= (duration_minutes * 60)
        return False
    
    def calculate_results(self, session_id=None):
        """Calculate quiz results"""
        if not self.questions or not self.user_answers:
            return None
        
        correct_answers = 0
        total_questions = len(self.questions)
        quiz_type = None
        
        # Get current quiz type
        for key, value in self.quiz_types.items():
            if value['name'] == self.current_quiz:
                quiz_type = key
                break
        
        # Process each question and store in database if session_id is provided
        for i, question in enumerate(self.questions):
            if i < len(self.user_answers):
                correct_option = question['correct_option'].upper()
                user_answer = self.user_answers[i]
                is_correct = (user_answer == correct_option)
                if is_correct:
                    correct_answers += 1
                
                # Store individual question result in database if session_id is provided
                if session_id and not self.api_mode_active:
                    time_taken_per_question = (self.end_time - self.start_time) / len(self.user_answers)
                    insert_result_to_db(
                        session_id,
                        question,
                        user_answer,
                        is_correct,
                        int(time_taken_per_question),
                        quiz_type
                    )
        
        score = correct_answers
        accuracy = (correct_answers / total_questions) * 100 if total_questions > 0 else 0
        
        # Calculate time taken
        time_taken = self.end_time - self.start_time if self.end_time and self.start_time else 0
        time_taken_minutes = time_taken / 60
        
        results = {
            'score': score,
            'total_questions': total_questions,
            'accuracy': accuracy,
            'time_taken_seconds': time_taken,
            'time_taken_minutes': time_taken_minutes,
            'correct_answers': correct_answers
        }
        
        # Update test session with results if session_id is provided
        if session_id and not self.api_mode_active:
            update_test_session(session_id, int(accuracy), int(time_taken))
        
        return results
    
    def display_results(self, results):
        """Display quiz results"""
        print("\n" + "="*60)
        print("QUIZ RESULTS")
        print("="*60)
        print(f"Score: {results['correct_answers']}/{results['total_questions']}")
        print(f"Accuracy: {results['accuracy']:.2f}%")
        print(f"Time Taken: {results['time_taken_minutes']:.2f} minutes ({results['time_taken_seconds']:.1f} seconds)")
        print("="*60)
        
        # Performance feedback
        if results['accuracy'] >= 90:
            print("Excellent performance! 🎉")
        elif results['accuracy'] >= 75:
            print("Good job! 👍")
        elif results['accuracy'] >= 60:
            print("Average performance. Keep practicing! 📚")
        else:
            print("Needs improvement. Don't give up! 💪")
    
    def save_results_to_file(self, results, quiz_config):
        """Save results to a JSON file"""
        result_data = {
            'timestamp': datetime.now().isoformat(),
            'quiz_type': self.current_quiz,
            'quiz_config': quiz_config,
            'results': results,
            'questions_and_answers': []
        }
        
        # Add question details
        for i, question in enumerate(self.questions):
            q_data = {
                'question': question['question'],
                'correct_answer': question['correct_option'],
                'user_answer': self.user_answers[i] if i < len(self.user_answers) else 'Not answered',
                'is_correct': (self.user_answers[i] == question['correct_option'].upper()) if i < len(self.user_answers) else False
            }
            result_data['questions_and_answers'].append(q_data)
        
        # Save to file
        filename = f"quiz_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        try:
            with open(filename, 'w') as f:
                json.dump(result_data, f, indent=2)
            print(f"\nResults saved to: {filename}")
        except Exception as e:
            print(f"Error saving results: {e}")
    
    def run_quiz(self):
        """Main method to run the quiz system"""
        print("Welcome to the Quiz System!")
        
        while True:
            # Step 1: Choose quiz type
            self.display_quiz_options()
            quiz_choice = self.get_quiz_selection()
            
            if quiz_choice is None:
                break
            
            self.current_quiz = self.quiz_types[quiz_choice]['name']
            csv_file = self.quiz_types[quiz_choice]['file']
            
            print(f"\nYou selected: {self.current_quiz}")
            
            # Step 2: Get quiz configuration
            config = self.get_quiz_configuration(quiz_choice)
            if config is None:
                continue
            
            self.quiz_config = config
            
            # Load questions from CSV
            all_questions = self.load_csv_data(csv_file)
            if not all_questions:
                print("Error: Could not load questions. Please check CSV file.")
                continue
            
            # Step 3: Filter and select questions
            filtered_questions = self.filter_questions(all_questions, config, quiz_choice)
            
            # Generate a unique session ID for this quiz attempt
            session_id = generate_session_id(prefix='cli')
            print(f"Session ID: {session_id}")
            
            # Store test session in database
            try:
                insert_test_session(
                    session_id,
                    self.current_quiz,
                    config['level'],
                    config.get('domain', 'all'),
                    config['num_questions'],
                    config['duration']
                )
                print("Test session created in database.")
            except Exception as e:
                print(f"Warning: Could not create test session in database: {e}")
            
            self.questions = self.select_random_questions(filtered_questions, config['num_questions'], session_id)
            
            print(f"\n{len(self.questions)} questions loaded successfully!")
            print(f"Duration: {config['duration']} minutes")
            print(f"Level: {config['level']}")
            if quiz_choice == '2' and config.get('domain'):
                print(f"Domain: {config['domain']}")
            
            input("\nPress Enter to start the quiz...")
            
            # Step 4: Start the quiz
            self.start_time = time.time()
            self.user_answers = []
            
            print(f"\nQUIZ STARTED! You have {config['duration']} minutes.")
            print("Type 'quit' at any time to exit the quiz.")
            
            # Step 5: Ask questions
            for i, question in enumerate(self.questions, 1):
                # Check time limit
                if self.check_time_limit(config['duration']):
                    print("\n⏰ Time limit exceeded! Quiz will be submitted automatically.")
                    break
                
                # Display question
                print(self.format_question(question, i))
                
                # Show remaining time
                elapsed_time = (time.time() - self.start_time) / 60
                remaining_time = config['duration'] - elapsed_time
                print(f"Time remaining: {remaining_time:.1f} minutes")
                
                # Get user answer
                user_answer = self.get_user_answer()
                if user_answer is None:
                    print("Quiz terminated.")
                    break
                
                self.user_answers.append(user_answer)
                print(f"Answer recorded: {user_answer}")
            
            # Step 6: End quiz and calculate results
            self.end_time = time.time()
            
            if self.user_answers:
                results = self.calculate_results(session_id)
                if results:
                    self.display_results(results)
                    
                    # Store test results in database
                    try:
                        # Generate strengths, weaknesses, and recommendations based on results
                        strengths = []
                        weaknesses = []
                        recommendations = []
                        
                        # Simple logic for generating feedback
                        if results['accuracy'] >= 80:
                            strengths.append("Strong understanding of concepts")
                            recommendations.append("Consider advanced topics")
                        elif results['accuracy'] >= 60:
                            strengths.append("Good grasp of basics")
                            weaknesses.append("Some knowledge gaps")
                            recommendations.append("Focus on weak areas")
                        else:
                            weaknesses.append("Fundamental knowledge gaps")
                            recommendations.append("Review core concepts")
                        
                        # Store results in database
                        insert_test_results(
                            session_id,
                            int(results['accuracy']),
                            results['correct_answers'],
                            results['total_questions'],
                            int(results['time_taken_seconds']),
                            strengths,
                            weaknesses,
                            recommendations
                        )
                        print("Test results stored in database.")
                    except Exception as e:
                        print(f"Warning: Could not store test results in database: {e}")
                    
                    # Ask if user wants to save results
                    save_choice = input("\nSave results to file? (y/n): ").strip().lower()
                    if save_choice == 'y':
                        self.save_results_to_file(results, config)
            else:
                print("No answers recorded.")
            
            # Ask if user wants to take another quiz
            another_quiz = input("\nTake another quiz? (y/n): ").strip().lower()
            if another_quiz != 'y':
                break
        
        print("Thank you for using the Quiz System! Goodbye!")
    
    def api_mode(self, config_json):
        """Run in API mode to return questions based on JSON configuration"""
        try:
            # Set flag to indicate we're running in API mode
            self.api_mode_active = True
            
            # Parse configuration
            config = json.loads(config_json)
            quiz_type = config.get('quiz_type', '1')
            num_questions = config.get('num_questions', 10)
            duration = config.get('duration', 30)
            level = config.get('level', 'Intermediate')
            domain = config.get('domain', 'all')
            # Get session ID from config or generate a new one
            session_id = config.get('session_id')
            if not session_id:
                session_id = generate_session_id(prefix='api')
            print(f"Using session ID: {session_id}")
            
            # Set current quiz and config
            self.current_quiz = self.quiz_types[quiz_type]['name']
            csv_file = self.quiz_types[quiz_type]['file']
            
            self.quiz_config = {
                'num_questions': num_questions,
                'duration': duration,
                'level': level,
                'domain': domain
            }
            
            # Load questions from CSV
            all_questions = self.load_csv_data(csv_file)
            if not all_questions:
                return json.dumps({"error": "Could not load questions. Please check CSV file."})
            
            # Filter and select questions
            filtered_questions = self.filter_questions(all_questions, self.quiz_config, quiz_type)
            self.questions = self.select_random_questions(filtered_questions, num_questions, session_id)
            
            # Return questions as JSON
            return json.dumps(self.questions)
            
        except Exception as e:
            return json.dumps({"error": str(e)})


def main():
    """Main function to run the quiz system"""
    # Check if running in API mode (with JSON config as argument)
    if len(sys.argv) > 1:
        try:
            config_json = sys.argv[1]
            quiz_system = QuizSystem()
            result = quiz_system.api_mode(config_json)
            print(result)
        except Exception as e:
            print(json.dumps({"error": str(e)}))
    else:
        # Original CLI mode
        quiz_system = QuizSystem()
        try:
            quiz_system.run_quiz()
        except KeyboardInterrupt:
            print("\n\nQuiz system terminated by user. Goodbye!")
        except Exception as e:
            print(f"\nAn error occurred: {e}")
            print("Please contact system administrator.")


def insert_result_to_db(session_id, row, chosen_option, is_correct, time_taken, quiz_type):
    try:
        conn, success, error = get_db_connection()
        if not success:
            print("Database Error:", error)
            return
            
        cursor = conn.cursor()
        
        # First check if the table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'quiz_results'
            )
        """)
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            # Create the table if it doesn't exist
            cursor.execute("""
                CREATE TABLE quiz_results (
                    id SERIAL PRIMARY KEY,
                    session_id VARCHAR(100) NOT NULL,
                    question TEXT NOT NULL,
                    option_a TEXT NOT NULL,
                    option_b TEXT NOT NULL,
                    option_c TEXT NOT NULL,
                    option_d TEXT NOT NULL,
                    correct_option CHAR(1) NOT NULL,
                    chosen_option CHAR(1),
                    is_correct BOOLEAN,
                    time_taken INTEGER,
                    level VARCHAR(20) NOT NULL,
                    domain VARCHAR(50) NOT NULL,
                    skill VARCHAR(50) NOT NULL,
                    quiz_type VARCHAR(20) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            print("Created quiz_results table")
            
            # Create indexes for better performance
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_quiz_results_session_id ON quiz_results(session_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_quiz_results_domain ON quiz_results(domain)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_quiz_results_level ON quiz_results(level)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_quiz_results_skill ON quiz_results(skill)")
        else:
            # Check if session_id column exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' AND table_name = 'quiz_results' AND column_name = 'session_id'
                )
            """)
            column_exists = cursor.fetchone()[0]
            
            if not column_exists:
                # Add session_id column if it doesn't exist
                cursor.execute("ALTER TABLE quiz_results ADD COLUMN session_id VARCHAR(100) NOT NULL DEFAULT 'legacy_session'")
                print("Added session_id column to quiz_results table")
                
                # Create index for the new column
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_quiz_results_session_id ON quiz_results(session_id)")

        cursor.execute("""
            INSERT INTO quiz_results (
                session_id, question, option_a, option_b, option_c, option_d,
                correct_option, chosen_option, is_correct, time_taken,
                level, domain, skill, quiz_type
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            session_id, row['question'], row['option_A'], row['option_B'], row['option_C'], row['option_D'],
            row['correct_option'], chosen_option, is_correct, time_taken,
            row['level'], row['domain'], row['skill'], quiz_type
        ))

        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print("Database Error:", e)


def insert_test_session(session_id, test_type, level, domain, question_count, time_limit):
    try:
        conn, success, error = get_db_connection()
        if not success:
            print("Database Error:", error)
            return
            
        cursor = conn.cursor()
        
        # First check if the table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'test_sessions'
            )
        """)
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            # Create the table if it doesn't exist
            cursor.execute("""
                CREATE TABLE test_sessions (
                    session_id VARCHAR(100) PRIMARY KEY,
                    test_type VARCHAR(20) NOT NULL,
                    level VARCHAR(20) NOT NULL,
                    domain VARCHAR(50) NOT NULL,
                    question_count INTEGER NOT NULL,
                    time_limit INTEGER NOT NULL,
                    start_time TIMESTAMP NOT NULL,
                    end_time TIMESTAMP,
                    score INTEGER,
                    total_time_taken INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            print("Created test_sessions table")
            
            # Create index for better performance
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_test_sessions_test_type ON test_sessions(test_type)")
        else:
            # Check if session_id column exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' AND table_name = 'test_sessions' AND column_name = 'session_id'
                )
            """)
            column_exists = cursor.fetchone()[0]
            
            if not column_exists:
                # Add session_id column if it doesn't exist
                cursor.execute("ALTER TABLE test_sessions ADD COLUMN session_id VARCHAR(100) PRIMARY KEY DEFAULT 'legacy_session'")
                print("Added session_id column to test_sessions table")

        cursor.execute("""
            INSERT INTO test_sessions (
                session_id, test_type, level, domain, question_count, time_limit, start_time
            ) VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
        """, (
            session_id, test_type, level, domain, question_count, time_limit
        ))

        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print("Database Error:", e)


def update_test_session(session_id, score, total_time_taken):
    try:
        conn, success, error = get_db_connection()
        if not success:
            print("Database Error:", error)
            return
            
        cursor = conn.cursor()
        
        # First check if the table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'test_sessions'
            )
        """)
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            print("Error: test_sessions table does not exist")
            # Create the table if it doesn't exist
            cursor.execute("""
                CREATE TABLE test_sessions (
                    session_id VARCHAR(100) PRIMARY KEY,
                    test_type VARCHAR(20) NOT NULL,
                    level VARCHAR(20) NOT NULL,
                    domain VARCHAR(50) NOT NULL,
                    question_count INTEGER NOT NULL,
                    time_limit INTEGER NOT NULL,
                    start_time TIMESTAMP NOT NULL,
                    end_time TIMESTAMP,
                    score INTEGER,
                    total_time_taken INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            print("Created test_sessions table")
            
            # Create index for better performance
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_test_sessions_test_type ON test_sessions(test_type)")
            return
        else:
            # Check if session_id column exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' AND table_name = 'test_sessions' AND column_name = 'session_id'
                )
            """)
            column_exists = cursor.fetchone()[0]
            
            if not column_exists:
                # Add session_id column if it doesn't exist
                try:
                    cursor.execute("ALTER TABLE test_sessions ADD COLUMN session_id VARCHAR(100) PRIMARY KEY DEFAULT 'legacy_session'")
                    print("Added session_id column to test_sessions table")
                except Exception as e:
                    print(f"Error adding session_id column: {e}")
                    # Try a different approach if the first one fails
                    try:
                        cursor.execute("ALTER TABLE test_sessions ADD COLUMN session_id VARCHAR(100) NOT NULL DEFAULT 'legacy_session'")
                        cursor.execute("ALTER TABLE test_sessions ADD PRIMARY KEY (session_id)")
                        print("Added session_id column to test_sessions table (two-step approach)")
                    except Exception as e2:
                        print(f"Error in two-step approach: {e2}")
                        return

        # Now try to update the session
        try:
            cursor.execute("""
                UPDATE test_sessions 
                SET end_time = CURRENT_TIMESTAMP, score = %s, total_time_taken = %s 
                WHERE session_id = %s
            """, (
                score, total_time_taken, session_id
            ))

            conn.commit()
            cursor.close()
            conn.close()
        except Exception as e:
            print(f"Error updating test session: {e}")
    except Exception as e:
        print("Database Error:", e)


def insert_test_results(session_id, score, correct_answers, total_questions, time_taken, strengths, weaknesses, recommendations):
    try:
        conn, success, error = get_db_connection()
        if not success:
            print("Database Error:", error)
            return
            
        cursor = conn.cursor()
        
        # First check if the table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'test_results'
            )
        """)
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            # Create the table if it doesn't exist
            cursor.execute("""
                CREATE TABLE test_results (
                    id SERIAL PRIMARY KEY,
                    session_id VARCHAR(100) NOT NULL,
                    score INTEGER NOT NULL,
                    correct_answers INTEGER NOT NULL,
                    total_questions INTEGER NOT NULL,
                    time_taken INTEGER NOT NULL,
                    strengths TEXT[],
                    weaknesses TEXT[],
                    recommendations TEXT[],
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            print("Created test_results table")
            
            # Add foreign key if test_sessions table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'test_sessions'
                )
            """)
            if cursor.fetchone()[0]:
                try:
                    cursor.execute("""
                        ALTER TABLE test_results
                        ADD CONSTRAINT fk_test_results_session_id
                        FOREIGN KEY (session_id) REFERENCES test_sessions(session_id)
                    """)
                    print("Added foreign key constraint to test_results table")
                except Exception as e:
                    print(f"Warning: Could not add foreign key constraint: {e}")
        else:
            # Check if session_id column exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' AND table_name = 'test_results' AND column_name = 'session_id'
                )
            """)
            column_exists = cursor.fetchone()[0]
            
            if not column_exists:
                # Add session_id column if it doesn't exist
                cursor.execute("ALTER TABLE test_results ADD COLUMN session_id VARCHAR(100) NOT NULL DEFAULT 'legacy_session'")
                print("Added session_id column to test_results table")
                
                # Try to add foreign key constraint
                try:
                    cursor.execute("""
                        ALTER TABLE test_results
                        ADD CONSTRAINT fk_test_results_session_id
                        FOREIGN KEY (session_id) REFERENCES test_sessions(session_id)
                    """)
                    print("Added foreign key constraint to test_results table")
                except Exception as e:
                    print(f"Warning: Could not add foreign key constraint: {e}")

        cursor.execute("""
            INSERT INTO test_results (session_id, score, correct_answers, total_questions, time_taken, strengths, weaknesses, recommendations)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            session_id, score, correct_answers, total_questions, time_taken, strengths, weaknesses, recommendations
        ))

        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print("Database Error:", e)


if __name__ == "__main__":
    main()