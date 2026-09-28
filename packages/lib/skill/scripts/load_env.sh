# Load API keys from a .env file into the environment. Source it from a generate.sh:
#
#   . node_modules/videowright/skill/scripts/load_env.sh
#
# It reads ./.env, or the file named by VW_ENV_FILE. (No positional argument: a sourced file sees the
# calling script's own arguments.)
#
# Each KEY=VALUE line is exported unless KEY is already set in the environment, so a key exported
# by the shell or a wrapper wins over .env. A value that is a 1Password secret reference
# (op://vault/item/field) is resolved with the 1Password CLI (`op read`); the secret is never
# printed. Works in sh, bash and zsh. A missing .env is not an error: keys may come from the shell.

__vw_env_file="${VW_ENV_FILE:-.env}"
__vw_cr="$(printf '\r')"
if [ -f "$__vw_env_file" ]; then
  while IFS= read -r __vw_line || [ -n "$__vw_line" ]; do
    __vw_line="${__vw_line%"$__vw_cr"}"
    case "$__vw_line" in '' | '#'*) continue ;; esac
    __vw_line="${__vw_line#export }"
    __vw_key="${__vw_line%%=*}"
    __vw_value="${__vw_line#*=}"
    case "$__vw_key" in '' | *[!A-Za-z0-9_]* | [0-9]*) continue ;; esac
    # Keys already in the environment win.
    [ -n "$(printenv "$__vw_key")" ] && continue
    case "$__vw_value" in
      \"*\") __vw_value="${__vw_value#\"}"; __vw_value="${__vw_value%\"}" ;;
      \'*\') __vw_value="${__vw_value#\'}"; __vw_value="${__vw_value%\'}" ;;
    esac
    case "$__vw_value" in
      op://*)
        if ! command -v op >/dev/null 2>&1; then
          echo "load_env: $__vw_key is a 1Password reference but the op CLI is not installed" >&2
          return 1 2>/dev/null || exit 1
        fi
        if ! __vw_value="$(op read --no-newline "$__vw_value" </dev/null)"; then
          echo "load_env: could not resolve $__vw_key from 1Password (is op signed in?)" >&2
          return 1 2>/dev/null || exit 1
        fi
        ;;
    esac
    export "$__vw_key=$__vw_value"
  done <"$__vw_env_file"
fi
unset __vw_env_file __vw_cr __vw_line __vw_key __vw_value
