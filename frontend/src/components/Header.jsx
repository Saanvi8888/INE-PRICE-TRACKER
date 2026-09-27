function Header() {
  return (
    <header className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-6 py-5 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Product Price Tracker
        </h1>

        <p className="text-gray-500 mt-1 font-mono">
          Search for a product and track its price & stock
        </p>
      </div>
    </header>
  );
}

export default Header;