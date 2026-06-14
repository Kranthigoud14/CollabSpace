function Button({ children, type = "button" }) {
  return (
    <button
      type={type}
      className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
    >
      {children}
    </button>
  );
}

export default Button;