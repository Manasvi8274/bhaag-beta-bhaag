"""Drive local Qwen (Ollama) to write one module, test it, and loop on failures.

usage: python tools/qwen.py SPEC OUT [--test T] [--ctx F ...] [--iters N]
Uses qwen2.5-coder:3b (7B disabled for RAM; see BIG).
Prints only a short summary; full transcripts go to tools/logs/.
"""
import argparse, json, re, subprocess, sys, urllib.request, pathlib, time

ROOT = pathlib.Path(__file__).resolve().parent.parent
# ponytail: 3B only - 7B ran the PC out of RAM. Set BIG back to "qwen2.5:7b-instruct" if RAM allows.
SMALL, BIG = "qwen2.5-coder:3b", "qwen2.5-coder:3b"


def ask(model, prompt):
    body = json.dumps({"model": model, "prompt": prompt, "stream": False,
                       "options": {"num_ctx": 12288, "temperature": 0.2}}).encode()
    req = urllib.request.Request("http://localhost:11434/api/generate", body,
                                 {"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=1800))["response"]


def extract(text):
    blocks = re.findall(r"```(?:javascript|js|mjs)?\s*\n(.*?)```", text, re.S)
    return max(blocks, key=len) if blocks else text


def fix_exports(code, test_src, out_name):
    """Qwen often forgets `export`; add it to names the test imports from this module."""
    for names in re.findall(r"import\s*\{([^}]*)\}\s*from\s*['\"][./]*src/" + re.escape(out_name) + "['\"]", test_src):
        for n in [x.strip() for x in names.split(",") if x.strip()]:
            if re.search(r"export\s+(?:async\s+)?(?:function|const|let|class)\s+" + n + r"\b", code) or re.search(r"export\s*\{[^}]*\b" + n + r"\b", code):
                continue
            code = re.sub(r"^(\s*)((?:async\s+)?(?:function|const|let|class)\s+" + n + r"\b)", r"\1export \2", code, count=1, flags=re.M)
    return code


def check(out, test):
    for cmd in (["node", "--check", str(out)], ["node", "--test", str(test)] if test else None):
        if not cmd:
            continue
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=120)
        if r.returncode:
            return (r.stdout + r.stderr)[-3500:]
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("spec"); ap.add_argument("out")
    ap.add_argument("--test"); ap.add_argument("--ctx", nargs="*", default=[])
    ap.add_argument("--iters", type=int, default=8)
    a = ap.parse_args()
    out = ROOT / a.out
    rules = (ROOT / "GAME.md").read_text(encoding="utf-8").split("## Code rules")[1].split("## Modules")[0]
    ctx = "".join(f"\n--- {f} ---\n{(ROOT / f).read_text(encoding='utf-8')}\n" for f in a.ctx)
    test_src = (ROOT / a.test).read_text(encoding="utf-8") if a.test else ""
    base = (f"You are an expert JavaScript game developer. Write the file `{a.out}`.\n"
            f"Code rules:{rules}\nContext files:{ctx}\nSPEC:\n"
            f"{(ROOT / a.spec).read_text(encoding='utf-8')}\n"
            + (f"\nYour file must pass this test file ({a.test}):\n```js\n{test_src}\n```\n" if test_src else "")
            + "\nReply with ONLY the complete file in one ```js code block.")
    log = ROOT / "tools" / "logs" / (out.stem + ".log")
    log.parent.mkdir(exist_ok=True)
    prompt, err = base, None
    with log.open("a", encoding="utf-8") as L:
        for i in range(1, a.iters + 1):
            model = SMALL if i <= 3 else BIG
            t = time.time()
            code = fix_exports(extract(ask(model, prompt)), test_src, out.name)
            out.write_text(code, encoding="utf-8")
            err = check(out, a.test)
            L.write(f"\n===== iter {i} {model} {time.time()-t:.0f}s =====\n{code}\n--- result ---\n{err or 'PASS'}\n")
            print(f"iter {i} [{model}] {time.time()-t:.0f}s -> {'PASS' if not err else 'fail'}", flush=True)
            if not err:
                print(f"PASS {a.out} ({len(code.splitlines())} lines)")
                return 0
            prompt = (base + f"\n\nYour previous version:\n```js\n{code}\n```\nIt FAILED with:\n```\n{err}\n```\n"
                      "Fix every failure. Reply with ONLY the complete corrected file in one ```js code block.")
    print(f"FAIL {a.out} after {a.iters} iters. Last error tail:\n" + "\n".join(err.splitlines()[-25:]))
    return 1


if __name__ == "__main__":
    sys.exit(main())
