function Login() {

    const hashPassword = async password => Array.from(
        new Uint8Array(
            await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
        )
    ).map(b => b.toString(16).padStart(2, '0')).join('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData);
        
        const hashedPassword = await hashPassword(data.password);
                
        try {
            const response = await sendHttpRequest('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: {
                    username: data.username,
                    password: hashedPassword
                }
            });

            // Se il login ha successo, reindirizza alla chat
            window.open(window.chatUrl, '_self');
        } catch (error) {
            console.error('Errore durante il login:', error);

            // Aggiungi classe CSS per animazione di shake al pulsante di submit
            let submitBtn = document.getElementById("submitBtn");
            submitBtn.classList.add("shakeElement");
            setTimeout(() => {  submitBtn.classList.remove("shakeElement"); }, 1000); 

            // Mostra messaggio di errore
            let errorMessage = document.getElementById("login-form-error-div");
            errorMessage.innerText = "Credenziali non valide >:(";
        }
    };

    return (
        <div className="auth-page">
            <Header isUserLogged={false}/>
            <div className="login-card">
                <div className="login-card-body">
                    <h1 className="login-title">Login</h1>
                    <form onSubmit={handleSubmit}>
                        <div className="login-form-group">
                            <label htmlFor="username" className="login-form-label">Username</label>
                            <input
                                type="text"
                                name="username"
                                id="username"
                                className="form-input"
                                placeholder="Inserisci il tuo username"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="password" className="login-form-label">Password</label>
                            <input
                                type="password"
                                name="password"
                                id="password"
                                className="form-input"
                                placeholder="Inserisci la tua password"
                                required
                            />
                        </div>
                        <div id="login-form-error-div"></div>
                        <button id="submitBtn" type="submit" className="login-submit-button">Accedi</button>
                    </form>
                </div>
            </div>
        </div>
    );
}
