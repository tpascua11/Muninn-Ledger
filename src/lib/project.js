const generateId = () => `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export { generateId };

export const createDefaultProject = (name = "New Project") => {
    const leftInactiveFolderId = generateId();
    const rightInactiveFolderId = generateId();
    return {
        id: generateId(),
        title: name,
        leftDesk: {
            folders: [{ id: leftInactiveFolderId, name: 'Inactive Folder', papers: [] }],
            archive: [],
            trash: []
        },
        rightDesk: {
            folders: [
                { id: generateId(), name: 'Active Folder', papers: [] },
                { id: rightInactiveFolderId, name: 'Inactive Folder 2', papers: [] }
            ],
            trash: []
        },
        mainStack: [{
            id: generateId(),
            content: `Hello, User!

Welcome to Muninn's Ledger — a writing desk where you can write, think, and use AI to help you do both. Your work lives in papers, your papers live in folders, and your folders feed into the AI when you need it.

Papers & the Desk
This is a paper. The center of the screen is your desk — where you write. You can have multiple papers open at once; they stack as tabs at the top. The one on top is the one you're working on.

Folders & Context
Papers are stored in folders on the left and right sidebars. The left side is your context — what the AI knows about. Each folder has a power toggle to activate or deactivate it, and each paper has a checkmark to include or exclude it from the AI's awareness.

The AI Prompt
At the bottom of the desk is a prompt bar. Type a message and hit send — the AI will respond directly into your current paper. It reads everything in your active context when it does. Use the gear button to configure your API key, system instructions, and temperature.

Moving This Paper
When you're done reading, grab this tab by its left edge and drag it into one of the folders in the sidebar to store it — or keep it on the desk if you'd like it nearby.

Archive & Trash
At the bottom of each sidebar you'll find an Archive and a Trash bin. Drag a folder or paper there when you're done with it. Archive keeps things safely stored. Trash holds them until you delete permanently. In fact — once you're done here, drag me into one of them.`,
            subject: "Guide to Muninn's Ledger",
            inContext: true
        }],
        inactiveFolderIds: [leftInactiveFolderId, rightInactiveFolderId],
        aiSettings: {
            systemPrompt: 'You are a helpful AI writing assistant.',
            temperature: 0.7,
            maxTokens: 131072
        }
    };
};