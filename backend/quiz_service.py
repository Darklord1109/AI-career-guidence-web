import pandas as pd
import random
import time
from datetime import datetime, timedelta
import json
import os
import sys
import psycopg2

DB_CONFIG = {
    'dbname': 'contactdb',
    'user': 'your_db_user',
    'password': 'your_password',
    'host': 'localhost',
    'port': '5432'
}


class QuizSystem:
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
        
    def load_csv_data(self, file_path):
        """Load questions from CSV file"""
        try:
            # Determine the absolute path to the CSV file
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            absolute_path = os.path.join(base_dir, file_path)
            
            df = pd.read_csv(absolute_path)
            return df.to_dict('records')
        except FileNotFoundError:
            print(f"Error: CSV file '{file_path}' not found.")
            return []
        except Exception as e:
            print(f"Error loading CSV: {e}")
            return []
    
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
            print(f"Warning: Only {len(filtered_questions)} questions available with your criteria.")
            print("Including questions from other levels/domains to meet your requirement.")
            filtered_questions = all_questions.copy()
        
        return filtered_questions
    
    def select_random_questions(self, questions, num_questions):
        """Select random questions from filtered list"""
        if len(questions) <= num_questions:
            return questions
        return random.sample(questions, num_questions)
    
    def api_mode(self, config_json):
        """Run in API mode to return questions based on JSON configuration"""
        try:
            # Parse configuration
            config = json.loads(config_json)
            quiz_type = config.get('quiz_type', '1')
            num_questions = config.get('num_questions', 10)
            duration = config.get('duration', 30)
            level = config.get('level', 'Intermediate')
            domain = config.get('domain', 'all')
            
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
            self.questions = self.select_random_questions(filtered_questions, num_questions)
            
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
        # Original CLI mode (not used in API integration)
        print(json.dumps({"error": "CLI mode not supported in this version. Please provide JSON config."}))        


if __name__ == "__main__":
    main()