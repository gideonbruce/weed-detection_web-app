import { useState } from "react"
import { useNavigate } from "react-router-dom";

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setMessage("");
        setError("");

        try {
            const response = await fetch("http://localhost:5000/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage("A reset link has been sent to your email.");

                setTimeout(() => {
                    navigate(`/reset-password?token=${data.reset_link.split("token=")[1]}`);
                }, 3000);
            } else {
                setError(data.message || "Something went wrong.");
            }
        }
        catch (error) {
            setError("Error connecting to server");
        }
    };


    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-700 text-center">Forgot Password</h2>
                <p className="text-gray-500 text-center mb-4">Enter your email to recieve a password reset link.</p>
                {message && <p className="text-green-600 text-center">{message}</p>}
                {error && <p className="text-red-600 text-center">{error}</p>}
                <form onSubmit={handleForgotPassword}>
                    <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500"
                    />
                    <button 
                       type="submit"
                       className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white py-2 rounded-md transition"
                       >
                        Reset Password
                        </button>
                </form>
            </div>
        </div>
    );
};

export default ForgotPassword;