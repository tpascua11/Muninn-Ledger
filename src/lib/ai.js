export const buildContextMessages = (project, systemPrompt, userPrompt, assistantSeed = null) => {
    const inactiveIds = new Set(project.inactiveFolderIds || []);
    const contextPapers = [];

    const collectFromDesk = (desk) => {
        desk.folders.forEach(folder => {
            if (inactiveIds.has(folder.id)) return;
            folder.papers.forEach(paper => {
                if (paper.inContext === false) return;
                if (paper.content || paper.subject)
                    contextPapers.push({
                        subject: paper.subject || 'Untitled',
                        content: paper.content || ''
                    });
            });
        });
    };

    collectFromDesk(project.leftDesk);
    collectFromDesk(project.rightDesk);

    let fullSystem = systemPrompt;
    if (contextPapers.length > 0) {
        const docs = contextPapers
            .map((p, i) => `--- Document ${i + 1}: ${p.subject} ---\n${p.content}`)
            .join('\n\n');
        fullSystem += `\n\n== Reference Documents ==\n${docs}`;
    }

    const messages = [{ role: 'system', content: fullSystem }];
    if (assistantSeed) messages.push({ role: 'assistant', content: assistantSeed });
    if (userPrompt) messages.push({ role: 'user', content: userPrompt });

    return { messages, contextPapers };
};

// Split paper content on the last chain divider.
// Returns { seed, hasDivider }
export const splitOnLastDivider = (content) => {
    const DIVIDER = '\n\n---\n\n';
    const lastIdx = content.lastIndexOf(DIVIDER);
    if (lastIdx === -1) return { seed: content, hasDivider: false };
    return { seed: content.slice(0, lastIdx), hasDivider: true };
};