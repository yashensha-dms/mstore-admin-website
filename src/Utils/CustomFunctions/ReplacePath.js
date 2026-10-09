export const replacePath = (path) => {
    let existingPath = [{ path: 'qna', switchPath: 'question_and_answer' }, { path: 'push-broadcast', switchPath: 'push_broadcast' }, { path: 'offer-banner', switchPath: 'offer_banner' }]
    let pathObj = existingPath.find((elem) => elem.path == path)
    return pathObj?.switchPath ? pathObj?.switchPath : path
}