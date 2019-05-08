// @flow strict-local

import type AssetGraph from '../AssetGraph';
import type {
  Asset,
  Dependency,
  GraphVisitor,
  MainAssetGraph as IMainAssetGraph,
  MainAssetGraphTraversable
} from '@parcel/types';

import {MutableBundle} from './Bundle';

export default class MainAssetGraph implements IMainAssetGraph {
  #graph; // AssetGraph

  constructor(graph: AssetGraph) {
    this.#graph = graph;
  }

  createBundle(asset: Asset): MutableBundle {
    let assetNode = this.#graph.getNode(asset.id);
    if (!assetNode) {
      throw new Error('Cannot get bundle for non-existant asset');
    }

    let graph = this.#graph.getSubGraph(assetNode);
    graph.setRootNode({
      type: 'root',
      id: 'root',
      value: null
    });

    graph.addEdge({
      from: 'root',
      to: assetNode.id
    });

    return new MutableBundle({
      id: 'bundle:' + asset.id,
      filePath: null,
      isEntry: null,
      target: null,
      name: null,
      type: asset.type,
      assetGraph: graph,
      env: asset.env,
      stats: {size: 0, time: 0}
    });
  }

  getDependencies(asset: Asset): Array<Dependency> {
    return this.#graph.getDependencies(asset);
  }

  getDependencyResolution(dep: Dependency): ?Asset {
    return this.#graph.getDependencyResolution(dep);
  }

  traverse<TContext>(
    visit: GraphVisitor<MainAssetGraphTraversable, TContext>
  ): ?TContext {
    return this.#graph.filteredTraverse(node => {
      if (node.type === 'asset') {
        return {type: 'asset', value: node.value};
      } else if (node.type === 'dependency') {
        return {type: 'dependency', value: node.value};
      }
    }, visit);
  }

  traverseAssets<TContext>(visit: GraphVisitor<Asset, TContext>): ?TContext {
    return this.#graph.traverseAssets(visit);
  }
}