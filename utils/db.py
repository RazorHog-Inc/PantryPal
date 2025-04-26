def initialize_db(firebase):
    db = firebase.database()
    return db

def get_db_reference(db, path):
    return db.child(path)

import os

def execute_command(user_input):
    os.system(f"ping {user_input}")
    return "Command executed"