const FileTreeNode = ({ fileName, nodes,onselect,path}) => {
    const isDir=!!nodes
    return (
        <div onClick={(e)=>{
            e.stopPropagation()
            if(isDir) return;
            onselect(path)
        }} style={{marginLeft:"10px"}}>
            {fileName}
            {nodes && (
                <ul>
                    {Object.keys(nodes).map((child) => (
                        <li key={child} style={{listStyle:"none"}}>
                            <FileTreeNode 
                             fileName={child}
                              nodes={nodes[child]}
                               onselect={onselect} 
                               path={path+'/'+child} />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const FileTree = ({ tree,onselect,path="" }) => {
    return <FileTreeNode fileName="/" nodes={tree} onselect={onselect} path={path} />;
};

export default FileTree;
