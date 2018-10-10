import ds9 from '../../ds9RemoteApi';

const dispatchResearchAnnounces = async (leCtx) => {
    let curTechs = await leCtx.rcon.send('/collect_technology_researches');
    let curTechsParsed = JSON.parse(curTechs);
    let techQuery = {};

    if (curTechsParsed instanceof Array) {
        for (var techKey of Object.keys(curTechsParsed)) {
            var tech = curTechsParsed[techKey];
            techQuery[tech.name] = {
                researched: tech.researched,
                level: tech.level
            };

            ds9.technology.put(leCtx.config, techQuery);
        }
    }
}

const dispatchResearchUpdates = async (leCtx) => {
    let res = await ds9.technology.get(leCtx.config);
    if (res.error) {
        console.log('[-] ds9 Api error (tech ret): ' + res.error);
    } else {
        if (res.response) {
            let techUpdateQuery = [];
            let teches = res.body;
            for (var techKey of Object.keys(teches)) {
                var curTech = teches[techKey];
                techUpdateQuery.push({
                    name: techKey,
                    researched: curTech.researched,
                    level: curTech.level
                });
            }
            leCtx.rcon.send('/set_technologies ' + JSON.stringify(techUpdateQuery));
        } else {
            console.log('[-] Unexpected ds9 Api error: No resp');
        }
    }
}

export default {
    dispatchResearchAnnounces,
    dispatchResearchUpdates
};
