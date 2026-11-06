import { SUPPORTED_CURRENCIES } from "@accounting/shared/currencies";
import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { publicApiUrl } from "../api/api";
import { Card, PageHeader, SectionHeading, focusRing, td, th, writeToClipboard } from "../components/ui/primitives";
import { useApiKeys } from "../hooks/useApiKeys";

function CodeBlock({ tabs }: { tabs: { label: string; code: string }[] }) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const code = tabs[active]!.code;

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50/60">
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-2">
        <div className="flex gap-1" role="tablist">
          {tabs.map((tab, i) => (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={active === i}
              onClick={() => setActive(i)}
              className={`-mb-px border-b-2 px-2 py-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-600 ${
                active === i ? "border-neutral-950 text-neutral-950" : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={async () => {
            if (await writeToClipboard(code)) {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }
          }}
          className={`rounded px-2 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 ${focusRing}`}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-6 text-neutral-800">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Endpoint({ method, path }: { method: string; path: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1 font-mono text-[12.5px]">
      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">{method}</span>
      <span className="text-neutral-800">{path}</span>
    </div>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[12px] text-neutral-800">{children}</code>;
}

const parameters: { name: string; type: string; required: boolean; description: ReactNode }[] = [
  { name: "amount", type: "number", required: true, description: "Amount in the entry's currency, e.g. 0.5 for half an ETH." },
  {
    name: "currency",
    type: "enum",
    required: true,
    description: (
      <>
        One of{" "}
        {SUPPORTED_CURRENCIES.map((c, i) => (
          <span key={c}>
            {i > 0 ? ", " : ""}
            <Code>{c}</Code>
          </span>
        ))}
        . <Code>usd</Code> and <Code>eth</Code> are priced automatically; the others need <Code>usdValue</Code>.
      </>
    ),
  },
  {
    name: "type",
    type: "enum",
    required: true,
    description: (
      <>
        <Code>income</Code> or <Code>expense</Code>.
      </>
    ),
  },
  {
    name: "usdValue",
    type: "number",
    required: false,
    description: (
      <>
        Total value of the entry in USD, e.g. what you actually received. When omitted, it is computed from the current price of <Code>currency</Code> ×{" "}
        <Code>amount</Code>. Must be 0 or more.
      </>
    ),
  },
  {
    name: "category",
    type: "string",
    required: false,
    description: "Free-form label you choose, e.g. hosting or payroll, up to 255 characters. Used to break down the overview chart.",
  },
  { name: "dateOfEntry", type: "string", required: false, description: "ISO 8601 date. Defaults to now. Use it to backdate entries." },
  {
    name: "tags",
    type: "string[]",
    required: false,
    description: (
      <>
        Labels in <Code>key:value</Code> format, used to filter entries and statements.
      </>
    ),
  },
  { name: "metadata", type: "object", required: false, description: "Flat object of string, number or boolean values, stored with the entry." },
];

const mcpTools = [
  ["record_entries", "Record one or more income or expense entries, valued in USD like the API does."],
  ["list_entries", "List entries, newest first, filtered by date, tags or category."],
  ["get_statement", "Total income, expenses and net in USD, with a per-currency breakdown."],
  ["get_category_breakdown", "USD totals per category, per day, week or month."],
  ["delete_entry", "Delete an entry recorded by mistake."],
];

function Docs() {
  const { orgId = "" } = useParams();
  const { apiKeys } = useApiKeys(orgId);
  const apiKey = apiKeys?.[0]?.key ?? "YOUR_API_KEY";

  const body = `{
  "amount": 0.5,
  "currency": "eth",
  "type": "income",
  "category": "consulting",
  "tags": ["client:acme"],
  "metadata": { "invoice": "INV-1042" }
}`;

  const curl = `curl ${publicApiUrl}/v1/entries \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '${body.replace(/\n/g, "\n  ")}'`;

  const js = `const res = await fetch("${publicApiUrl}/v1/entries", {
  method: "POST",
  headers: {
    Authorization: "Bearer ${apiKey}",
    "Content-Type": "application/json",
  },
  body: JSON.stringify(${body.replace(/\n/g, "\n  ")}),
});

const [entry] = await res.json();`;

  const mcpUrl = `${publicApiUrl}/mcp`;
  const mcpClaudeCode = `claude mcp add --transport http firebook ${mcpUrl} \\
  --header "Authorization: Bearer ${apiKey}"`;
  const mcpJson = `{
  "mcpServers": {
    "firebook": {
      "type": "http",
      "url": "${mcpUrl}",
      "headers": { "Authorization": "Bearer ${apiKey}" }
    }
  }
}`;

  const response = `[
  {
    "id": "19eea422-05d2-457f-af2e-92db038a98fd",
    "type": "income",
    "amount": 0.5,
    "currency": "eth",
    "valueAtDate": 1113.86,
    "category": "consulting",
    "dateOfEntry": "2026-11-06T16:24:00.000Z",
    "tags": ["client:acme"],
    "metadata": { "invoice": "INV-1042" }
  }
]`;

  return (
    <section aria-labelledby="docs-title" className="max-w-4xl">
      <PageHeader
        id="docs-title"
        title="API reference"
        description="Record income and expenses from your backend. Every entry is valued in USD at the time it is recorded."
      />

      <div className="mt-8 space-y-10">
        <section aria-labelledby="auth-title">
          <SectionHeading id="auth-title" title="Authentication" />
          <p className="mt-3 text-sm leading-6 text-neutral-700">
            Authenticate requests with an API key in the <Code>Authorization</Code> header, as <Code>Bearer &lt;key&gt;</Code>. Keys are scoped to this
            organization.{" "}
            {apiKeys?.length ? (
              <>The examples below use your key “{apiKeys[0]!.name}”.</>
            ) : (
              <>
                You don't have a key yet:{" "}
                <Link to={`/o/${orgId}/api-keys`} className={`rounded font-medium text-[#1968ad] hover:underline ${focusRing}`}>
                  create one
                </Link>
                .
              </>
            )}
          </p>
        </section>

        <section aria-labelledby="create-title">
          <SectionHeading id="create-title" title="Create entries" description="Send a single entry, or an array to record several at once." />
          <div className="mt-4">
            <Endpoint method="POST" path="/v1/entries" />
          </div>

          <Card className="mt-4">
            <table className="w-full border-collapse text-left text-xs">
              <caption className="sr-only">Request body parameters</caption>
              <thead className="bg-neutral-50/50 text-neutral-500">
                <tr className="border-b border-neutral-200">
                  <th className={`${th} w-40`} scope="col">
                    Parameter
                  </th>
                  <th className={`${th} w-24`} scope="col">
                    Type
                  </th>
                  <th className={th} scope="col">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-neutral-700">
                {parameters.map((p) => (
                  <tr key={p.name} className="align-top">
                    <td className={`${td} py-2.5`}>
                      <span className="font-mono text-[12px] font-medium text-neutral-900">{p.name}</span>
                      {p.required ? <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Required</span> : null}
                    </td>
                    <td className={`${td} py-2.5 font-mono text-[11px] text-neutral-500`}>{p.type}</td>
                    <td className={`${td} py-2.5 leading-5`}>{p.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-neutral-500">Request</p>
              <CodeBlock
                tabs={[
                  { label: "cURL", code: curl },
                  { label: "JavaScript", code: js },
                ]}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-neutral-500">Response</p>
              <CodeBlock tabs={[{ label: "200 OK", code: response }]} />
            </div>
          </div>
        </section>

        <section aria-labelledby="mcp-title">
          <SectionHeading
            id="mcp-title"
            title="MCP server"
            description="Let an AI agent record entries and answer questions about your books, using the same API keys."
          />
          <div className="mt-4">
            <Endpoint method="POST" path="/mcp" />
          </div>
          <p className="mt-3 text-sm leading-6 text-neutral-700">
            A <Code>Streamable HTTP</Code> MCP server. Add it to Claude Code, Cursor or any MCP client with an API key in the <Code>Authorization</Code> header.
            The key decides which organization the agent works in.
          </p>
          <div className="mt-4">
            <CodeBlock
              tabs={[
                { label: "Claude Code", code: mcpClaudeCode },
                { label: "JSON config", code: mcpJson },
              ]}
            />
          </div>
          <Card className="mt-4">
            <table className="w-full border-collapse text-left text-xs">
              <caption className="sr-only">MCP tools</caption>
              <thead className="bg-neutral-50/50 text-neutral-500">
                <tr className="border-b border-neutral-200">
                  <th className={`${th} w-52`} scope="col">
                    Tool
                  </th>
                  <th className={th} scope="col">
                    What it does
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-neutral-700">
                {mcpTools.map(([name, description]) => (
                  <tr key={name} className="align-top">
                    <td className={`${td} py-2.5 font-mono text-[12px] font-medium text-neutral-900`}>{name}</td>
                    <td className={`${td} py-2.5 leading-5`}>{description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>

        <section aria-labelledby="errors-title">
          <SectionHeading id="errors-title" title="Errors" />
          <dl className="mt-1">
            {[
              ["400", "The body failed validation. The response includes an errors array describing each problem."],
              ["401", "The API key is missing, invalid or revoked."],
            ].map(([code, text]) => (
              <div key={code} className="flex gap-4 border-b border-neutral-100 py-2.5 text-sm last:border-b-0">
                <dt className="w-12 shrink-0 font-mono text-[12.5px] font-medium text-neutral-900">{code}</dt>
                <dd className="text-neutral-700">{text}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </section>
  );
}

export default Docs;
