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
        }
        
        let res = await ds9.technology.put(leCtx.config, techQuery);
        
        if (res.error || (res.response.statusCode != 200)) {
            let reason;
            if (res.error)
                reason = res.error.code;
            else
                reason = "HTTP " + res.response.statusCode;
            
            
            console.log('[-] DS9RC-TXTECH HTTP req failed: ' + reason);
        }
    }

    return Promise.resolve();
}

const dispatchResearchUpdates = async (leCtx) => {
    let res = await ds9.technology.get(leCtx.config);
    if (!res.error && (res.response.statusCode == 200)) {
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
        await leCtx.rcon.send('/set_technologies ' + JSON.stringify(techUpdateQuery));
    } else {
        let reason;
        if (res.error)
            reason = res.error.code;
        else
            reason = "HTTP " + res.response.statusCode;
        
        console.log('[-] DS9RC-RXTECH HTTP req failed: ' + reason);
    }

    return Promise.resolve();
}

export default {
    dispatchResearchAnnounces,
    dispatchResearchUpdates
};
