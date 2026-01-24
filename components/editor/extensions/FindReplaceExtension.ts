import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { TextSelection } from "@tiptap/pm/state";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

export interface FindReplaceOptions {
  searchTerm: string;
  caseSensitive: boolean;
}

export interface FindReplaceStorage {
  searchTerm: string;
  caseSensitive: boolean;
  currentIndex: number;
  results: Array<{ from: number; to: number }>;
}

// Extend the Commands and Storage interfaces
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    findReplace: {
      setSearchTerm: (searchTerm: string) => ReturnType;
      toggleCaseSensitive: () => ReturnType;
      findNext: () => ReturnType;
      findPrevious: () => ReturnType;
      replaceNext: (replaceWith: string) => ReturnType;
      replaceAll: (replaceWith: string) => ReturnType;
      clearSearch: () => ReturnType;
    };
  }

  interface Storage {
    findReplace?: FindReplaceStorage;
  }
}

const findReplacePluginKey = new PluginKey("findReplace");

/**
 * Find & Replace Extension for Tiptap
 * Provides search and replace functionality with match highlighting and navigation
 */
export const FindReplaceExtension = Extension.create<FindReplaceOptions>({
  name: "findReplace",

  addOptions() {
    return {
      searchTerm: "",
      caseSensitive: false,
    };
  },

  addStorage() {
    return {
      searchTerm: "",
      caseSensitive: false,
      currentIndex: -1,
      results: [],
    };
  },

  addCommands() {
    return {
      /**
       * Set the search term and find all matches
       */
      setSearchTerm:
        (searchTerm: string) =>
        ({ state, dispatch }: { state: EditorState; dispatch: ((tr: Transaction) => void) | undefined }) => {
          if (dispatch) {
            const tr = state.tr.setMeta(findReplacePluginKey, {
              type: "SET_SEARCH_TERM",
              searchTerm,
            });
            dispatch(tr);
          }
          return true;
        },

      /**
       * Toggle case sensitivity
       */
      toggleCaseSensitive:
        () =>
        ({ state, dispatch }: { state: EditorState; dispatch: ((tr: Transaction) => void) | undefined }) => {
          if (dispatch) {
            const tr = state.tr.setMeta(findReplacePluginKey, {
              type: "TOGGLE_CASE_SENSITIVE",
            });
            dispatch(tr);
          }
          return true;
        },

      /**
       * Navigate to the next match
       */
      findNext:
        () =>
        ({ state, dispatch, view }: { state: EditorState; dispatch: ((tr: Transaction) => void) | undefined; view: EditorView }) => {
          const pluginState = findReplacePluginKey.getState(state);
          if (!pluginState || pluginState.results.length === 0) return false;

          if (dispatch) {
            const nextIndex =
              (pluginState.currentIndex + 1) % pluginState.results.length;
            const tr = state.tr.setMeta(findReplacePluginKey, {
              type: "SET_CURRENT_INDEX",
              index: nextIndex,
            });
            dispatch(tr);

            // Scroll to the match
            const match = pluginState.results[nextIndex];
            if (match) {
              const selectionTr = view.state.tr.setSelection(
                TextSelection.create(
                  view.state.tr.doc,
                  match.from,
                  match.to,
                ),
              );
              view.dispatch(selectionTr.scrollIntoView());
              view.focus();
            }
          }
          return true;
        },

      /**
       * Navigate to the previous match
       */
      findPrevious:
        () =>
        ({ state, dispatch, view }: { state: EditorState; dispatch: ((tr: Transaction) => void) | undefined; view: EditorView }) => {
          const pluginState = findReplacePluginKey.getState(state);
          if (!pluginState || pluginState.results.length === 0) return false;

          if (dispatch) {
            const prevIndex =
              pluginState.currentIndex <= 0
                ? pluginState.results.length - 1
                : pluginState.currentIndex - 1;
            const tr = state.tr.setMeta(findReplacePluginKey, {
              type: "SET_CURRENT_INDEX",
              index: prevIndex,
            });
            dispatch(tr);

            // Scroll to the match
            const match = pluginState.results[prevIndex];
            if (match) {
              const selectionTr = view.state.tr.setSelection(
                TextSelection.create(
                  view.state.tr.doc,
                  match.from,
                  match.to,
                ),
              );
              view.dispatch(selectionTr.scrollIntoView());
              view.focus();
            }
          }
          return true;
        },

      /**
       * Replace the current match
       */
      replaceNext:
        (replaceWith: string) =>
        ({ state, dispatch, view }: { state: EditorState; dispatch: ((tr: Transaction) => void) | undefined; view: EditorView }) => {
          const pluginState = findReplacePluginKey.getState(state);
          if (
            !pluginState ||
            pluginState.results.length === 0 ||
            pluginState.currentIndex === -1
          )
            return false;

          if (dispatch) {
            const match = pluginState.results[pluginState.currentIndex];
            if (match) {
              const tr = state.tr.insertText(
                replaceWith,
                match.from,
                match.to,
              );
              // After replacement, trigger a new search
              tr.setMeta(findReplacePluginKey, {
                type: "REPLACE_CURRENT",
              });
              dispatch(tr);
              view.focus();
            }
          }
          return true;
        },

      /**
       * Replace all matches
       */
      replaceAll:
        (replaceWith: string) =>
        ({ state, dispatch, view }: { state: EditorState; dispatch: ((tr: Transaction) => void) | undefined; view: EditorView }) => {
          const pluginState = findReplacePluginKey.getState(state);
          if (!pluginState || pluginState.results.length === 0) return false;

          if (dispatch) {
            let tr = state.tr;
            // Replace from the end to maintain position integrity
            const sortedResults = [...pluginState.results].sort(
              (a, b) => b.from - a.from,
            );

            sortedResults.forEach((match) => {
              tr = tr.insertText(replaceWith, match.from, match.to);
            });

            tr.setMeta(findReplacePluginKey, {
              type: "REPLACE_ALL",
            });
            dispatch(tr);
            view.focus();
          }
          return true;
        },

      /**
       * Clear the search
       */
      clearSearch:
        () =>
        ({ state, dispatch }: { state: EditorState; dispatch: ((tr: Transaction) => void) | undefined }) => {
          if (dispatch) {
            const tr = state.tr.setMeta(findReplacePluginKey, {
              type: "CLEAR_SEARCH",
            });
            dispatch(tr);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: findReplacePluginKey,
        state: {
          init(): FindReplaceStorage {
            return {
              searchTerm: "",
              caseSensitive: false,
              currentIndex: -1,
              results: [],
            };
          },
          apply(tr, pluginState) {
            const meta = tr.getMeta(findReplacePluginKey);

            if (!meta) {
              // If document changed, re-search with current term
              if (tr.docChanged && pluginState.searchTerm) {
                const results = findMatches(
                  tr.doc,
                  pluginState.searchTerm,
                  pluginState.caseSensitive,
                );
                return {
                  ...pluginState,
                  results,
                  currentIndex:
                    results.length > 0
                      ? Math.min(pluginState.currentIndex, results.length - 1)
                      : -1,
                };
              }
              return pluginState;
            }

            switch (meta.type) {
              case "SET_SEARCH_TERM": {
                const searchTerm = meta.searchTerm;
                const results = searchTerm
                  ? findMatches(tr.doc, searchTerm, pluginState.caseSensitive)
                  : [];
                extension.storage.searchTerm = searchTerm;
                extension.storage.results = results;
                extension.storage.currentIndex = results.length > 0 ? 0 : -1;
                return {
                  ...pluginState,
                  searchTerm,
                  results,
                  currentIndex: results.length > 0 ? 0 : -1,
                };
              }
              case "TOGGLE_CASE_SENSITIVE": {
                const caseSensitive = !pluginState.caseSensitive;
                const results = pluginState.searchTerm
                  ? findMatches(tr.doc, pluginState.searchTerm, caseSensitive)
                  : [];
                extension.storage.caseSensitive = caseSensitive;
                extension.storage.results = results;
                extension.storage.currentIndex = results.length > 0 ? 0 : -1;
                return {
                  ...pluginState,
                  caseSensitive,
                  results,
                  currentIndex: results.length > 0 ? 0 : -1,
                };
              }
              case "SET_CURRENT_INDEX": {
                const currentIndex = meta.index;
                extension.storage.currentIndex = currentIndex;
                return {
                  ...pluginState,
                  currentIndex,
                };
              }
              case "REPLACE_CURRENT":
              case "REPLACE_ALL": {
                // After replacement, re-search
                const results = pluginState.searchTerm
                  ? findMatches(
                      tr.doc,
                      pluginState.searchTerm,
                      pluginState.caseSensitive,
                    )
                  : [];
                extension.storage.results = results;
                extension.storage.currentIndex = results.length > 0 ? 0 : -1;
                return {
                  ...pluginState,
                  results,
                  currentIndex: results.length > 0 ? 0 : -1,
                };
              }
              case "CLEAR_SEARCH": {
                extension.storage.searchTerm = "";
                extension.storage.results = [];
                extension.storage.currentIndex = -1;
                return {
                  searchTerm: "",
                  caseSensitive: pluginState.caseSensitive,
                  currentIndex: -1,
                  results: [],
                };
              }
              default:
                return pluginState;
            }
          },
        },
        props: {
          decorations(state) {
            const pluginState = findReplacePluginKey.getState(state);
            if (!pluginState || pluginState.results.length === 0) {
              return DecorationSet.empty;
            }

            const decorations: Decoration[] = [];

            (pluginState.results as Array<{ from: number; to: number }>).forEach((match: { from: number; to: number }, index: number) => {
              const isActive = index === pluginState.currentIndex;
              const decoration = Decoration.inline(match.from, match.to, {
                class: isActive
                  ? "find-replace-match-active"
                  : "find-replace-match",
              });
              decorations.push(decoration);
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

/**
 * Find all matches of a search term in the document
 */
function findMatches(
  doc: any,
  searchTerm: string,
  caseSensitive: boolean,
): Array<{ from: number; to: number }> {
  const matches: Array<{ from: number; to: number }> = [];
  if (!searchTerm) return matches;

  const searchRegex = new RegExp(
    searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    caseSensitive ? "g" : "gi",
  );

  doc.descendants((node: any, pos: number) => {
    if (node.isText) {
      const text = node.text;
      let match;
      searchRegex.lastIndex = 0; // Reset regex state

      while ((match = searchRegex.exec(text)) !== null) {
        matches.push({
          from: pos + match.index,
          to: pos + match.index + match[0].length,
        });
      }
    }
  });

  return matches;
}
