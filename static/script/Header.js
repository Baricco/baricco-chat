const { useState, useEffect, useRef } = React;

function Header(props) {
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Codice per gestire apertura e chiusura del contextMenu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  
  const logout = async () => {
    try {
      await sendHttpRequest('/logout');
      window.open(window.loginUrl, '_self');
    } catch (error) {
      console.error('Errore durante il logout:', error);
    }
  };

  /*
    
    List Item della pagina delle impostazioni

        <li>
          <i className="bi bi-gear-fill"></i>
          <a href={window.settingsUrl}>Settings</a>
      </li>
  
  
  */

  const contextMenu = () => {
    if (props.isUserLogged || false) {
        return (
            <div className="dropdown-menu">
                <ul>
                    <li>
                        <i className="bi bi-person-fill"></i>
                        <a href={window.profileUrl}>Profile</a>
                    </li>
                    <li>
                        <i className="bi bi-box-arrow-left"></i>
                        <a onClick={logout}>Logout</a>
                    </li>
                </ul>
            </div>
        );
    }
    return (
        <div className="dropdown-menu">
            <ul>
                <li>
                    <i className="bi bi-person-fill"></i>
                    <a href={window.loginUrl}>Login/Register</a>
                </li>
            </ul>
        </div>
    );
  }

  return (
    <div id="headerDiv">
      <h3 id="appName"><a href={window.chatUrl}>BariccoChat</a></h3>
      <div
        className="d-flex align-items-center justify-content-end login-div"
        onClick={toggleMenu}
        ref={menuRef}
      >
        <i className="bi bi-person-fill login-icon"></i>
        {isMenuOpen && contextMenu()}
      </div>
    </div>
  );
}