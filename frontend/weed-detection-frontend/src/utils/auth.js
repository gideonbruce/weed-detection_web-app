export const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
        // Check if token is expired (if it's a JWT)
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiration = payload.exp * 1000; // Convert to milliseconds
        if (Date.now() >= expiration) {
            logout(); // Clear invalid token
            return false;
        }
        return true;
    } catch (error) {
        console.error('Token validation error:', error);
        logout(); // Clear invalid token
        return false;
    }
};

export const setToken = (token) => {
    localStorage.setItem('token', token);
};

export const getToken = () => {
    return localStorage.getItem('token');
};

export const logout = () => {
    localStorage.removeItem('token');
    window.location.href = '/'; // Redirect to login page
};
