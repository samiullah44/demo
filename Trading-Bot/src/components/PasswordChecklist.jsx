import { useState, useEffect } from "react";

const rules = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (pw) => pw.length >= 8,
  },
  {
    id: "lower",
    label: "At least one lowercase letter",
    test: (pw) => /[a-z]/.test(pw),
  },
  {
    id: "upper",
    label: "At least one uppercase letter",
    test: (pw) => /[A-Z]/.test(pw),
  },
  { id: "number", label: "At least one number", test: (pw) => /\d/.test(pw) },
];

export default function PasswordChecklist({ password, onValidChange }) {
  const [results, setResults] = useState({});

  useEffect(() => {
    const res = {};
    rules.forEach((rule) => {
      res[rule.id] = rule.test(password);
    });
    setResults(res);
    const allValid = Object.values(res).every(Boolean);
    onValidChange(allValid);
  }, [password, onValidChange]);

  return (
    <div className="mt-2 space-y-1 text-sm">
      {rules.map((rule) => (
        <div key={rule.id} className="flex items-center gap-2">
          <span
            className={`w-4 h-4 flex items-center justify-center rounded-full text-white text-xs ${
              results[rule.id] ? "bg-green-500" : "bg-red-500"
            }`}
          >
            {results[rule.id] ? "✓" : "X"}
          </span>
          <span
            className={results[rule.id] ? "text-green-600" : "text-red-600"}
          >
            {rule.label}
          </span>
        </div>
      ))}
    </div>
  );
}