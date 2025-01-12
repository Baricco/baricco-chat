from flask import Flask, render_template, send_file, session, request, jsonify, make_response
from flask_cors import CORS, logging
from datetime import datetime, timedelta, timezone
from flask_sqlalchemy import SQLAlchemy
import os
import uuid

# Inizializzazione dell'applicazione Flask
app = Flask(__name__)
app.instance_path  # Questo assicura che la directory instance venga creata
app.secret_key = 'your_secret_key'
app.config['CORS_HEADERS'] = 'Content-Type'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

FRONTEND_URL = "https://127.0.0.1:5000"

# Estensioni permesse delle immagini
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

# Creazione della directory per le immagini del profilo
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'instance/profile_pics/')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Configurazione CORS
CORS(app, 
    resources={r"/*": {
         "origins": FRONTEND_URL,
         "supports_credentials": True,
         "allow_headers": ["Content-Type"],
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    }}
)

logging.getLogger('flask_cors').level = logging.DEBUG

# Configurazione della sessione
app.config.update(
    SESSION_COOKIE_SECURE=True,     # Richiesto per HTTPS
    SESSION_COOKIE_HTTPONLY=False,    # Cookie accessibile solo tramite HTTP
    SESSION_COOKIE_SAMESITE='None',  # Importante per le richieste cross-origin
    PERMANENT_SESSION_LIFETIME=timedelta(minutes=30)  # Durata della sessione
)

# Inizializzazione del database
database = SQLAlchemy(app)

# Definizione delle tabelle del database

class User(database.Model):
    __tablename__ = 'users'
    id = database.Column(database.String, primary_key=True, unique=True, nullable=False)
    username = database.Column(database.String, unique=True, nullable=False)
    password = database.Column(database.String, nullable=False)
    join_date = database.Column(database.DateTime(timezone=True), server_default=database.func.now())
    

    def __init__(self, id, username, password, join_date):
        self.id = id
        self.username = username
        self.password = password
        self.join_date = join_date
        

    def __repr__(self):
        return f"ID: {self.id}, Username: {self.username}"

class Message(database.Model):
    __tablename__ = 'messages'
    id = database.Column(database.String, primary_key=True, unique=True, nullable=False)
    content = database.Column(database.String, nullable=False)
    send_dateTime = database.Column(database.DateTime(timezone=True), server_default=database.func.now())
    chat_user_id = database.Column(database.String, nullable=False)


    def __init__(self, id, chat_user_id, content, send_dateTime):
        self.id = id
        self.chat_user_id = chat_user_id
        self.content = content
        self.send_dateTime = send_dateTime
    
    def __repr__(self):
        return f"ID: {self.id}, ChatUser ID: {self.chat_user_id}, Content: {self.content}, Send_Date: {self.send_dateTime}"

class ChatUser(database.Model):
    __tablename__ = 'chat_users'
    id = database.Column(database.String, primary_key=True, unique=True, nullable=False)
    user_id = database.Column(database.String, nullable=False)
    chat_id = database.Column(database.String, nullable=False)

    def __init__(self, id, user_id, chat_id):
        self.id = id
        self.user_id = user_id
        self.chat_id = chat_id

    def __repr__(self):
        return f"ID: {self.id}, User ID: {self.user_id}, Chat ID: {self.chat_id}"

class Chat(database.Model):
    __tablename__ = 'chats'
    id = database.Column(database.String, primary_key=True, unique=True, nullable=False)
    name = database.Column(database.String, nullable=True)
    creation_date = database.Column(database.DateTime(timezone=True), server_default=database.func.now())
    
    def __init__(self, id, name, creation_date):
        self.id = id
        self.name = name
        self.creation_date = creation_date

    def __repr__(self):
        return f"ID: {self.id}, Name: {self.name}, Creation Date: {self.creation_date}"
    

# Classe per la gestione del database 
class DBManager:
    
    def __init__(self, app=None, database=None):
        self.app = app
        database = database
        if app is not None:
            self.init_app(app)

    def init_app(self, app):
        #database.init_app(app)
        with app.app_context():
            database.create_all()

    def get_db(self):
        return database

    def add_user(self, username, password):
        user_id = str(uuid.uuid4())
        database.session.add(User(id=user_id, username=username, password=password, join_date=datetime.now()))
        database.session.commit()

    def add_message(self, message: Message):
        database.session.add(message)
        database.session.commit()

    def delete_user(self, user: User):
        database.session.delete(user)
        database.session.commit()

    def delete_message(self, message: Message):
        database.session.delete(message)
        database.session.commit()

    def update(self):
        database.session.commit()

    def get_all(self, model):
        return model.query.all()

    def get_user_by_username(self, username):
        return database.session.query(User).filter_by(username=username).first()

    def get_user_by_id(self, id):
        return database.session.get(User, id)
        
    def get_chat_messages(self, chat_id):
        return database.session.query(Message).filter_by(chat_id=chat_id).all()

    def get_message_by_id(self, id):
        return database.session.get(Message, id)
    
    def get_chat_by_id(self, id):
        return database.session.get(Chat, id)
    
    def get_chat_users_by_chat_id(self, chat_id):
        return database.session.query(ChatUser).filter_by(chat_id=chat_id).all()
    
    def get_chat_users_by_user_id(self, user_id):
        return database.session.query(ChatUser).filter_by(user_id=user_id).all()

    def get_chat_user_by_chat_id_and_user_id(self, chat_id, user_id):
        return database.session.query(ChatUser).filter_by(chat_id=chat_id, user_id=user_id).first()        

    def get_chat_user_by_id(self, id):
        return database.session.get(ChatUser, id)

    def create_chat(self, chat: Chat):
        database.session.add(chat)
        database.session.commit()
    
    def add_user_to_chat(self, user: User, chat: Chat):

        if database.session.query(ChatUser).filter_by(user_id=user.id, chat_id=chat.id).first() is not None:
            return

        chat_user = ChatUser(id=str(uuid.uuid4()), user_id=user.id, chat_id=chat.id)
        database.session.add(chat_user)
        database.session.commit()
        return chat_user

    def remove_user_from_chat(self, user: User, chat: Chat):
        chat_user = database.session.query(ChatUser).filter_by(user_id=user.id, chat_id=chat.id).first()
        database.session.delete(chat_user)
        database.session.commit()

    def get_user_chats(self, user_id):
        return database.session.query(ChatUser).filter_by(user_id=user_id).all()
    
    def get_chat_messages(self, chat_id):
        
        # Prendi tutti gli utenti della chat
        chat_users = database.session.query(ChatUser).filter_by(chat_id=chat_id).all()

        # Per ogni utente, prendi i suoi messaggi spediti nella chat
        messages = []
        for chat_user in chat_users:
            messages.extend(database.session.query(Message).filter_by(chat_user_id=chat_user.id).all())
        return messages
    


# Inizializzazione del database manager
db_manager = DBManager(app, database)

def is_user_logged_in():
    return ('logged_in' in session)

@app.route('/')
def chat():
    if not is_user_logged_in():
        print('ERROR - User not Logged!')
        return render_template('login.html')
    return render_template('chat.html')

@app.route('/profile')
def profile():
    if not is_user_logged_in():
        print('ERROR - User not Logged!')
        return render_template('login.html')
    return render_template('profile.html')

@app.route('/settings')
def settings():
    if not is_user_logged_in():
        print('ERROR - User not Logged!')
        return render_template('login.html')
    return render_template('settings.html')

def manage_login(user_id, username):
    session.permanent = True
    session['logged_in'] = True
    session['userId'] = user_id
    print('user: ' + user_id + ", " + username + ' logged in')

@app.route('/login', methods=['POST', 'GET', 'OPTIONS'])
def login():

    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Origin', FRONTEND_URL+'/login')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    if request.method == 'POST':
        # Ottieni i dati JSON dalla richiesta
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        # Se l'utente non esiste, aggiungilo al database
        if db_manager.get_user_by_username(username) is None:
            print('User not found, adding to database')
            db_manager.add_user(username, password)
            user_id = db_manager.get_user_by_username(username).id
            print('user: ' + user_id + ", " + username + ' registered')
            manage_login(user_id, username)

            return jsonify({
                "message": "Registration successful",
                "success": True,
            }), 200
        
        
        user_id = db_manager.get_user_by_username(username).id

        # Se l'utente esiste, controlla la password
        if password == db_manager.get_user_by_id(user_id).password:
            manage_login(user_id, username)
            return jsonify({
                "message": "Login successful",
                "success": True,
            }), 200
        else:
            return jsonify({
                "message": "Invalid credentials",
                "success": False,
            }), 401
            
    return render_template('login.html')

@app.route('/chat/<chatId>', methods=['GET'])
def get_chat_messages(chatId):

    if not is_user_logged_in():
        return jsonify({
            "success": False,
            "message": "User not logged in",
        }), 401

    if db_manager.get_chat_user_by_chat_id_and_user_id(chatId, session.get('userId')) is None:
        return jsonify({
            "success": False,
            "message": "User not authorized",
        }), 200
    

    messages = db_manager.get_chat_messages(chatId)
    messages_data = []
    for message in messages:
        chat_user = db_manager.get_chat_user_by_id(message.chat_user_id)
        messages_data.append({
            "id": message.id,
            "content": message.content,
            "sendDateTime": message.send_dateTime,
            "userId": chat_user.user_id,
            "chatId": chat_user.chat_id
        })

    messages_data.sort(key=lambda x: x["sendDateTime"])

    return jsonify({
        "success": True,
        "messages": messages_data
    })

def getChatName(chatId, userId):
    chat_users = db_manager.get_chat_users_by_chat_id(chatId)
    chat_name = ""
    for chat_user in chat_users:
        if chat_user.user_id != userId:
            chat_name = db_manager.get_user_by_id(chat_user.user_id).username
            break
    return chat_name

@app.route('/userChat/<userId>', methods=['GET'])
def get_user_chats(userId):

    # Controllo dell'autenticazione dell'utente
    if not is_user_logged_in():
        return jsonify({
            "success": False,
            "message": "User not logged in",
        }), 401
    
    chatUsers = db_manager.get_user_chats(userId)
    chats_data = []
    for chatUser in chatUsers:
        chat = db_manager.get_chat_by_id(chatUser.chat_id)
        chat_name = chat.name if chat.name is not None else getChatName(chat.id, userId)
        chats_data.append({
            "id": chat.id,
            "name": chat_name,
            "creationDate": chat.creation_date
        })

    return jsonify({
        "success": True,
        "chats": chats_data
    })


def get_chat_between_users(userId1, userId2):
   
    # Prendi tutte le chat del primo utente
    chat_users1 = db_manager.get_chat_users_by_user_id(userId1)
    chat_ids1 = [cu.chat_id for cu in chat_users1]
    
    # Prendi tutte le chat del secondo utente
    chat_users2 = db_manager.get_chat_users_by_user_id(userId2)
    chat_ids2 = [cu.chat_id for cu in chat_users2]

    # Intersezione delle chat
    common_chat_ids = set(chat_ids1).intersection(chat_ids2)
    return next((db_manager.get_chat_by_id(chat_id) for chat_id in common_chat_ids), None)


@app.route('/chat/<userId1>/<userId2>', methods=['GET'])
def get_chat_by_users(userId1, userId2):
    # Controllo dell'autenticazione dell'utente
    if not is_user_logged_in():
        return jsonify({
            "success": False,
            "message": "User not logged in",
        }), 401

    # Controlla che i due utenti esistano
    if db_manager.get_user_by_id(userId1) is None or db_manager.get_user_by_id(userId2) is None:
        return jsonify({
            "success": False,
            "message": "User not found"
        })
    
    # Controlla se esiste già una chat tra i due utenti
    
    existing_chat = get_chat_between_users(userId1, userId2)

    # Se la chat esiste, ritorna l'id della chat
    if existing_chat is not None:
        print("La Chat Esiste: " + existing_chat.id)
        return jsonify({
            "success": True,
            "chatId": existing_chat.id
        })
    
    # Se la chat non esiste, crea la chat
    chat = Chat(id=str(uuid.uuid4()), name=None, creation_date=datetime.now())
    db_manager.create_chat(chat)
    db_manager.add_user_to_chat(db_manager.get_user_by_id(userId1), chat)
    db_manager.add_user_to_chat(db_manager.get_user_by_id(userId2), chat)
    print("La Chat è stata Creata: " + chat.id)

    return jsonify({
        "success": True,
        "chatId": chat.id
    })

@app.route('/sendMessage', methods=['POST']) 
def send_message():
    
    # Controllo dell'autenticazione dell'utente
    if not is_user_logged_in():
        return jsonify({
            "success": False,
            "message": "User not logged in",
        }), 401

    # Ottieni i dati JSON dalla richiesta
    data = request.get_json()

    # Ricava il messaggio e aggiungilo al database
    chat_user = db_manager.get_chat_user_by_chat_id_and_user_id(data.get('chatId'), data.get('senderId'))

    if chat_user is None:
        print("Error - ChatUser not found")
        return jsonify({
            "success": False,
            "message": "ChatUser not found",
        }), 200

    send_dateTime = datetime.fromtimestamp(float(data.get('sendDateTime')) / 1000, timezone.utc)

    message = Message(id=str(uuid.uuid4()), chat_user_id=chat_user.id, content=data.get('content'), send_dateTime=send_dateTime)
    db_manager.add_message(message)

    return jsonify({
        "success": True,
        "message": "Message: " + message.id + " sent successfully",
    })

@app.route('/userProfile', methods=['GET'])
def get_user_profile():
    if not is_user_logged_in():
        return jsonify({
            "success": False,
            "message": "User not logged in",
        }), 401
        
    # Recupera i dati dell'utente dal database
    user = db_manager.get_user_by_id(session.get('userId'))
    user_data = {
        "id": user.id,
        "username": user.username,
        "joinDate": user.join_date.strftime("%d/%m/%Y")
    }

    return jsonify({
        "success": True,
        "user": user_data
    })

@app.route('/userProfile/<username>', methods=['GET'])
def get_user_profile_by_username(username):
    
    # Se l'utente non è loggato, ritorna un errore
    if not is_user_logged_in():
        return jsonify({
            "success": False,
            "message": "User not logged in",
        }), 401

    # Recupera i dati dell'utente dal database
    user = db_manager.get_user_by_username(username)

    if user is None:
        return jsonify({
            "success": False,
            "message": "User not found",
        }), 200

    user_data = {
        "id": user.id,
        "username": user.username,
        "joinDate": user.join_date.strftime("%d/%m/%Y")
    }

    return jsonify({
        "success": True,
        "user": user_data
    })    

@app.route('/chatPic/<chatId>', methods=['GET'])
def get_chat_profile_pic(chatId):

    # Controlla che l'utente sia loggato
    if not is_user_logged_in():
        return jsonify({
            "success": False,
            "message": "User not logged in",
        }), 401

    # Prendi la chat dal db
    chat = db_manager.get_chat_by_id(chatId)

    # Se la chat non è presente nel db, ritorna un errore
    if chat is None:
        return jsonify({
            "success": False,
            "message": "Chat doesn't exist",
        }), 404

    # Se l'utente corrente non appartiene alla chat, ritorna un errore
    if db_manager.get_chat_user_by_chat_id_and_user_id(chat.id, session.get('userId')) is None:
        return jsonify({
            "success": False,
            "message": "User doesn't belong to this chat",
        }), 401

    # Prendi tutti i chatUser che appartengono alla chat (escluso l'utente)
    chat_users = []

    for chat_user in db_manager.get_chat_users_by_chat_id(chatId):
        if chat_user.user_id != session.get('userId'):
            chat_users.append(chat_user)

    # Si osservi che in questo momento, le chat possono avere solo due utenti, quindi la lista chat_users dovrebbe avere
    # un solo elemento, restituiamo la foto profilo dell'altro utente.
    # Questo approccio va bene per adesso ma andrà rivisto se verranno aggiunti i gruppi

    image_dir_path = f"instance/profile_pics/"

    image_path = f"{image_dir_path}{chat_users[0].user_id}.png"
    
    try:
        return send_file(
            image_path,
            mimetype='image/jpeg'
        )
    except FileNotFoundError:
        return send_file(
            f"{image_dir_path}default-pic.png",
            mimetype='image/png'
        )



@app.route('/profilePic/<userId>', methods=['GET'])
def get_user_profile_pic(userId):
    if not is_user_logged_in():
        return jsonify({
            "success": False,
            "message": "User not logged in",
        }), 401
    
    image_dir_path = f"instance/profile_pics/"
        
    image_path = f"{image_dir_path}{userId}.png"
    
    try:
        return send_file(
            image_path,
            mimetype='image/jpeg'
        )
    except FileNotFoundError:
        return send_file(
            f"{image_dir_path}default-pic.png",
            mimetype='image/png'
        )


def get_file_extension(filename):
    return filename.rsplit('.', 1)[1].lower()

def is_file_allowed(filename):
    return '.' in filename and get_file_extension(filename) in ALLOWED_EXTENSIONS


@app.route('/updateProfile', methods=['POST'])
def update_profile():
    if not is_user_logged_in():
        return jsonify({
            "success": False,
            "message": "User not logged in",
        }), 401

    data = request.form
    user = db_manager.get_user_by_id(session.get('userId'))
    if data.get('username'): 
        if user.username != data.get('username') and db_manager.get_user_by_username(data.get('username')) is not None:
            return jsonify({
                "success": False,
                "message": "Username already in use",
            }), 200
        
        user.username = data.get('username')

    if data.get('newPassword'):
        if data.get('password') != user.password:
            return jsonify({
                "success": False,
                "message": "Password is incorrect",
            }), 200
        user.password = data.get('newPassword')

    # Gestione dell'immagine
    if 'newPic' in request.files:
        image = request.files['newPic']
        
        # Controlla che il file sia un'immagine
        if not is_file_allowed(image.filename):
            return jsonify({
                "success": False,
                "message": "Invalid file type",
            }), 400


        if image.filename != '':
            
            # Ricava l'estensione dell'immagine
            image_extension = get_file_extension(image.filename)

            try:
                # Le immagini vengono salvate con i'id dell'utente
                image_filename = f"{session.get('userId')}{'.png' if image_extension == '' else '.' + image_extension}"
                # Percorso completo per salvare l'immagine
                image_path = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)
                # Salva l'immagine
                image.save(image_path)
            except Exception as e:
                return jsonify({
                    "success": False,
                    "message": f"Error saving image: {str(e)}",
                }), 500
            

    db_manager.update()

    return jsonify({
        "success": True,
        "message": "Profile updated successfully",
    })

@app.route('/checkLogin')
def check_login():
    return jsonify({
        "isLoggedIn": session.get('logged_in', False),
    })

@app.route('/getCurrentUserId')
def get_user_id():
    return jsonify({
        "userId": session.get('userId', None),
    })

@app.route('/logout')
def logout():
    user_id = session.get('userId')
    session.pop('logged_in', None)
    session.pop('userId', None)  # Rimuovi l'associazione dell'utente
    print('user: ' + user_id + ", " + db_manager.get_user_by_id(user_id).username + ' logged out')
    return jsonify({"message": "Logged out successfully"})


@app.route('/set_cookie')
def set_cookie():
    response = make_response("Cookie impostato")
    response.set_cookie(
        'session',
        'your_session_value',
        secure=False,  # Richiesto per HTTPS
        httponly=True,
        samesite='None',  # Necessario per le richieste cross-origin
        partitioned=True  # Attributo per partizionare il cookie
    )
    return response


@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    response.headers.add('Access-Control-Allow-Origin', FRONTEND_URL)
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')

    # Aggiungere Partitioned ai cookie di sessione
    if 'Set-Cookie' in response.headers:
        cookies = response.headers.getlist('Set-Cookie')
        new_cookies = []
        for cookie in cookies:
            if 'session=' in cookie:
                if '; Partitioned' not in cookie:
                    cookie += '; Partitioned'
            new_cookies.append(cookie)
        response.headers.set('Set-Cookie', ', '.join(new_cookies))
    return response

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True, ssl_context=('static/certificates/cert.pem', 'static/certificates/key.pem'))
