const { useState, useEffect } = React;

function Profile() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        newPassword: '',
        confirmPassword: '',
        newPic: null
    });

    useEffect(() => {
        const loadUserProfile = async () => {

            // fai la richiesta GET per ottenere il profilo dell'utente
            let response = await getUserProfile();
            
            // se l'utente non è loggato, reindirizza alla pagina di login
            if (response == null) {
                setError(error.message);
                if (error.message.includes('401')) {
                    window.open(window.loginUrl, '_self');
                }
            }
            // se l'utente è loggato, imposta i dati del profilo
            else {
                setUser(response);
                setFormData(prev => ({ 
                    ...prev, 
                    username: response.username 
                }));
            }

            setLoading(false);
        };

        loadUserProfile();
    }, []);

    const handleChange = (e) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);
        
        const file = e.dataTransfer.files[0];
        if (!file || !file.type.startsWith('image/')) {
            setError('Per favore carica solo immagini');
            return;
        }
    
        // Crea un URL locale per il preview dell'immagine
        const imageUrl = URL.createObjectURL(file);
        setUser(prev => ({
            ...prev,
            imageUrl: imageUrl
        }));
        
        // Aggiungi il file al formData
        setFormData(prev => ({
            ...prev,
            newImage: file
        }));
    };
    
    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
    
        // Crea un URL locale per il preview dell'immagine
        const imageUrl = URL.createObjectURL(file);
        setUser(prev => ({
            ...prev,
            imageUrl: imageUrl
        }));
        
        // Aggiungi il file al formData
        setFormData(prev => ({
            ...prev,
            newImage: file
        }));
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.newPassword !== formData.confirmPassword) {
            setError('Le password non corrispondono');
            return;
        }
        
        // Crea un nuovo FormData per inviare sia i dati del form che l'immagine
        const submitData = new FormData();
        
        // Aggiungi i dati del form
        submitData.append('username', formData.username);
        submitData.append('password', formData.password);
        submitData.append('newPassword', formData.newPassword);
        
        // Aggiungi l'immagine se presente
        if (formData.newImage && formData.newImage instanceof File) {
                        
            const blob = new Blob([formData.newImage], { type: formData.newImage.type });
            submitData.append('newPic', blob, user.id + '.png');
        }
    
        try {
            const response = await sendHttpRequest('/updateProfile', {
                method: 'POST',
                body: submitData // Non uso JSON.stringify qui perché stiamo inviando un FormData
            });
            if (response.success) {
                setUser(prev => ({ 
                    ...prev, 
                    username: formData.username,
                }));
                setIsEditing(false);
                window.location.reload();
            } else {
                setError(response.message);
            }
        } catch (error) {
            setError(error.message);
        }
    };

    if (loading) {
        return (
            <div className="container text-center p-5">
                <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container text-center p-5">
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            </div>
        );
    }

    if (!user) {
        window.open(window.chatUrl, '_self');
        return null;
    }

    return (
        <div className="container">
            <Header isUserLogged={true} />
            <div className="profile-page-content p-4">
                <h1 className="text-center mb-4">{user.username}</h1>
                <div className="column justify-content-center profile-info-container">
                    <div className="col-md-4 text-center profile-image-container">
                        <img
                            src={window.imageBaseUrl + user.id}
                            alt="Foto profilo"
                            className="img-fluid mb-3 profile-image"
                            style={{ width: "150px", height: "150px", objectFit: "cover" }}
                        />
                    </div>
                    <div className="col-md-8 profile-info text-center">
                        <p><strong>Data di Iscrizione:</strong> {user.joinDate}</p>
                    </div> 
                    <div className="col-md-8 profile-edit-container">
                        
                        {isEditing ? (
                            <form onSubmit={handleSubmit} className="mt-4" encType="multipart/form-data">
                                <div className="mb-3">
                                    <label className="form-label">Username</label>
                                    <input
                                        type="text"
                                        className="form-control form-input"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Password Attuale</label>
                                    <input
                                        type="password"
                                        className="form-control form-input"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Nuova Password</label>
                                    <input
                                        type="password"
                                        className="form-control form-input"
                                        name="newPassword"
                                        value={formData.newPassword}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Conferma Password</label>
                                    <input
                                        type="password"
                                        className="form-control form-input"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="mb-3 dropzone-container">
                                    <div className="column justify-content-center profile-info-container">
                                        <div className="col-md-4 text-center profile-image-container">
                                            <div 
                                                className={`dropzone-area ${isDragging ? 'drag-active' : ''}`}
                                                onDragOver={handleDragOver}
                                                onDragLeave={handleDragLeave}
                                                onDrop={handleDrop}
                                                onClick={() => document.getElementById('fileInput').click()}
                                            >
                                                <input 
                                                    type="file"
                                                    id="fileInput"
                                                    name="newPic"
                                                    style={{ display: 'none' }}
                                                    accept="image/*"
                                                    onChange={handleFileSelect}
                                                />
                                                <img
                                                    src={user.imageUrl || window.imageBaseUrl + user.id}
                                                    alt="Foto profilo"
                                                    className="img-fluid mb-3"
                                                    style={{ width: "150px", height: "150px", objectFit: "cover" }}
                                                />
                                                <div className="dropzone-overlay">
                                                    {isDragging ? (
                                                        <p>Rilascia l'immagine qui...</p>
                                                    ) : (
                                                        <p>Trascina un'immagine o clicca per selezionarla</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div> 
                                </div>
                                <div className="submit-buttons-container">
                                <button type="submit" className="me-2 profile-button">
                                    Salva
                                </button>
                                <button 
                                    type="button" 
                                    className="profile-button"
                                    onClick={() => setIsEditing(false)}
                                >
                                    Annulla
                                </button>
                                </div>
                            </form>
                        ) : (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="mt-3 profile-button"
                                >
                                    Modifica Profilo
                                </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
  