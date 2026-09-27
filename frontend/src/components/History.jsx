import { useEffect, useState } from "react";
import {  LineChart,Line,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer} from "recharts";

function History({ productId, variant }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!productId || !variant) return;
        const loadHistory = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/history/${productId}/${encodeURIComponent(variant)}`);
            const data = await response.json();
            setHistory(data);
        } catch (error) {
            console.error("HISTORY ERROR:", error);
        }

        setLoading(false);
        };
        loadHistory();
    }, [productId, variant]);

    const escapeCSV = (value) => {
        return `"${String(value ?? "").replace(/"/g, '""')}"`;
    };

    const exportCSV = () => {
        const headers = [
            "product_id",
            "product_name",
            "variant",
            "timestamp",
            "price",
            "stock",
            "outcome",
        ];

        const rows = history.map((item) => [
            escapeCSV(item.product_id),
            escapeCSV(item.product_name),
            escapeCSV(item.variant),
            escapeCSV(new Date(item.timestamp).toISOString()),
            escapeCSV(item.price),
            escapeCSV(item.stock),
            escapeCSV(item.outcome),
        ]);

        const csv = [
            headers.join(","),
            ...rows.map((row) => row.join(",")),
        ].join("\n");

        const blob = new Blob([csv], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `${productId}-${variant}-history.csv`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (!productId || !variant) return null;

    return (
        <div className="mt-8 bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-baseline justify-between mb-4">
                <div className="flex items-baseline gap-3">
                <h2 className="text-lg font-semibold text-gray-900">
                    Scrape History
                </h2>
                {!loading && history.length > 0 && (
                    <span className="text-sm text-gray-400">
                    {history.length} {history.length === 1 ? "entry" : "entries"}
                    </span>
                )}
                </div>

                {history.length > 0 && (
                <button
                    onClick={exportCSV}
                    className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                    Export CSV
                </button>
                )}
            </div>

            {loading ? (
                <div className="space-y-3">
                <div className="h-64 bg-gray-50 rounded-lg animate-pulse" />
                <div className="h-4 bg-gray-100 rounded w-1/3 animate-pulse" />
                </div>
            ) : history.length === 0 ? (
                <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
                <p className="text-sm text-gray-500">
                    No history available yet.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                    Run a price check to start building history.
                </p>
                </div>
            ) : (
                <>
                {/* Price Chart */}
                <div className="w-full h-72 mb-8 -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={history}
                        margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f1f5f9"
                        vertical={false}
                        />

                        <XAxis
                        dataKey="timestamp"
                        tickFormatter={(value) =>
                            new Date(value).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            })
                        }
                        tick={{ fontSize: 12, fill: "#94a3b8" }}
                        tickLine={false}
                        axisLine={{ stroke: "#e2e8f0" }}
                        />

                        <YAxis
                        tick={{ fontSize: 12, fill: "#94a3b8" }}
                        tickLine={false}
                        axisLine={false}
                        width={60}
                        tickFormatter={(value) =>
                            `Rs.${Number(value).toLocaleString()}`
                        }
                        />

                        <Tooltip
                        labelFormatter={(value) =>
                            new Date(value).toLocaleString()
                        }
                        formatter={(value) =>
                            value !== null? `₹${Number(value).toLocaleString()}`: "N/A"
                        }
                        contentStyle={{
                            borderRadius: 8,
                            border: "1px solid #e5e7eb",
                            fontSize: 13,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                        }}
                        />

                        <Line
                        type="monotone"
                        dataKey="price"
                        name="Price"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "#2563eb" }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                        />
                    </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto -mx-5 px-5">
                    <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 text-left">
                        <th className="py-2.5 pr-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Time
                        </th>
                        <th className="py-2.5 pr-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Price
                        </th>
                        <th className="py-2.5 pr-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Stock
                        </th>
                        <th className="py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Outcome
                        </th>
                        </tr>
                    </thead>

                    <tbody>
                        {history.map((item) => (
                        <tr
                            key={item.id}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                            <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">
                            {new Date(item.timestamp).toLocaleString()}
                            </td>

                            <td className="py-3 pr-4 font-medium text-gray-900 whitespace-nowrap">
                            {item.price !== null
                                ? `Rs.${Number(item.price).toLocaleString()}`
                                : "—"}
                            </td>

                            <td className="py-3 pr-4 text-gray-600">
                            {item.stock !== null ? item.stock : "—"}
                            </td>

                            <td className="py-3">
                            <span
                                className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                                item.outcome === "success"
                                    ? "bg-green-100 text-green-700"
                                    : item.outcome === "failed"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                            >
                                {item.outcome}
                            </span>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
                </>
            )}
        </div>
    );
}

export default History;