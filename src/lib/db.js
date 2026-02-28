import Dexie from 'dexie';

export const db = new Dexie('WritersDesk');
db.version(1).stores({
    projects: 'id, title',
    settings: 'key'
});

export const saveProjectToDB = async (project) => {
    await db.projects.put({
        id: project.id,
        title: project.title,
        data: JSON.stringify(project)
    });
};

export const loadAllProjects = async () => {
    const rows = await db.projects.toArray();
    return rows.map(r => JSON.parse(r.data));
};

export const saveSetting = async (key, value) => {
    await db.settings.put({ key, value });
};

export const loadSetting = async (key) => {
    const row = await db.settings.get(key);
    return row ? row.value : null;
};